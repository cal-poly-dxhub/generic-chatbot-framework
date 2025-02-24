/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
*/
import * as cdk from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as constants from '../common/constants';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import * as path from 'path';
import { BaseInfra } from '../base-infra';
import { Authentication } from '../auth';
import { WebSocket } from '../websocket';

export interface ApiProps {
    readonly baseInfra: BaseInfra;
    readonly authentication: Authentication;
    readonly rdsSecret?: secretsmanager.ISecret;
    readonly rdsEndpoint?: string;
    readonly knowledgeBaseId?: string;
    readonly conversationTable: ddb.ITable;
}

const defaultCorsPreflightOptions = {
    allowOrigins: apigw.Cors.ALL_ORIGINS,
    allowMethods: apigw.Cors.ALL_METHODS,
    allowHeaders: [...apigw.Cors.DEFAULT_HEADERS, 'x-amz-content-sha256'],
};

export class Api extends Construct {
    public readonly restApi: apigw.RestApi;
    public readonly webSocket: WebSocket;
    public readonly inferenceLambda: lambda.IFunction;

    public constructor(scope: Construct, id: string, props: ApiProps) {
        super(scope, id);

        const apiGatewayAccessLogs = new logs.LogGroup(this, 'ApiGatewayAccessLogs', {
            removalPolicy: props.baseInfra.removalPolicy,
        });

        const api = new apigw.RestApi(this, 'RestApi', {
            restApiName: `${props.baseInfra.solutionInfo.solutionName} API`,
            defaultCorsPreflightOptions,
            defaultMethodOptions: {
                authorizationType: apigw.AuthorizationType.IAM,
            },
            cloudWatchRole: true,
            deployOptions: {
                metricsEnabled: true,
                tracingEnabled: true,
                accessLogDestination: new apigw.LogGroupLogDestination(
                    apiGatewayAccessLogs
                ),
                accessLogFormat: apigw.AccessLogFormat.jsonWithStandardFields(),
            },
        });

        const corpusLambda = this.createCorpusResources(api, props);
        const conversationLambda = this.createChatResources(api, props);

        const inferenceLambda = this.createInferenceResources(
            api,
            props,
            conversationLambda,
            corpusLambda
        );
        this.inferenceLambda = inferenceLambda;
        this.webSocket = new WebSocket(this, 'WebSocket', {
            baseInfra: props.baseInfra,
            userPoolId: props.authentication.userPool.userPoolId,
            appClientId: props.authentication.appClientId,
            inferenceLambda,
        });

        // associate WAF WebACL to APIGateway if WebACL ARN is specified
        if (props.baseInfra.webAcl) {
            const webACLAssociation = new cdk.aws_wafv2.CfnWebACLAssociation(
                this,
                'WebACLAssociation',
                {
                    resourceArn: `arn:${cdk.Aws.PARTITION}:apigateway:${cdk.Aws.REGION}::/restapis/${api.restApiId}/stages/prod`,
                    webAclArn: props.baseInfra.webAcl.attrArn,
                }
            );
            webACLAssociation.node.addDependency(api);
        }

        new iam.Policy(this, 'ApiAuthenticatedRolePolicy', {
            roles: [props.authentication.identityPool.authenticatedRole],
            statements: [
                // Grant authenticated users in user pool "execute-api" permissions
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['execute-api:Invoke'],
                    resources: [api.arnForExecuteApi('*', '/*', '*')],
                }),
            ],
        });

        this.restApi = api;
    }

    private addMethod(
        resource: apigw.IResource,
        httpMethod: string,
        handler: lambda.Function
    ): void {
        resource.addMethod(httpMethod, new apigw.LambdaIntegration(handler), {
            authorizationType: apigw.AuthorizationType.IAM,
        });
    }

    private createChatResources(api: apigw.RestApi, props: ApiProps): lambda.Function {
        const chatResource = api.root.addResource('chat', {
            defaultCorsPreflightOptions,
        });

        const chatApiHandler = this.createLambdaHandler('conversation', props, {
            /* eslint-disable @typescript-eslint/naming-convention */
            ...(props.rdsSecret && {
                RDS_SECRET_ARN: props.rdsSecret.secretArn,
            }),
            ...(props.rdsEndpoint && { RDS_ENDPOINT: props.rdsEndpoint }),
            CONVERSATION_TABLE_NAME: props.conversationTable.tableName,
            CONVERSATION_INDEX_NAME: constants.CONVERSATION_STORE_GSI_INDEX_NAME,
            /* eslint-enable @typescript-eslint/naming-convention */
        });
        props.conversationTable.grantReadWriteData(chatApiHandler);
        props.rdsSecret?.grantRead(chatApiHandler);

        props.baseInfra.grantBedrockHandoffModelAccess(chatApiHandler);

        this.addMethod(chatResource, 'GET', chatApiHandler);
        this.addMethod(chatResource, 'PUT', chatApiHandler);

        const chatIdResource = chatResource.addResource('{chatId}', {
            defaultCorsPreflightOptions,
        });
        this.addMethod(chatIdResource, 'GET', chatApiHandler);
        this.addMethod(chatIdResource, 'DELETE', chatApiHandler);
        this.addMethod(chatIdResource, 'POST', chatApiHandler);

        const chatMessageResource = chatIdResource.addResource('message', {
            defaultCorsPreflightOptions,
        });
        this.addMethod(chatMessageResource, 'PUT', chatApiHandler);

        const chatMessageIdResource = chatMessageResource.addResource('{messageId}', {
            defaultCorsPreflightOptions,
        });
        this.addMethod(chatMessageIdResource, 'DELETE', chatApiHandler);

        const chatMessageSourceResource = chatMessageIdResource.addResource('source', {
            defaultCorsPreflightOptions,
        });
        this.addMethod(chatMessageSourceResource, 'GET', chatApiHandler);

        const userResource = chatIdResource.addResource('user', {
            defaultCorsPreflightOptions,
        });

        const userIdResource = userResource.addResource('{userId}', {
            defaultCorsPreflightOptions,
        });

        const handoffResource = userIdResource.addResource('handoff', {
            defaultCorsPreflightOptions,
        });

        this.addMethod(handoffResource, 'GET', chatApiHandler);

        return chatApiHandler;
    }

    private createCorpusResources(api: apigw.RestApi, props: ApiProps): lambda.Function {
        const corpusResource = api.root.addResource('corpus', {
            defaultCorsPreflightOptions,
        });

        const corpusApiHandler = this.createLambdaHandler('corpus', props, {
            /* eslint-disable @typescript-eslint/naming-convention */
            ...(props.rdsSecret && {
                RDS_SECRET_ARN: props.rdsSecret.secretArn,
            }),
            ...(props.rdsEndpoint && { RDS_ENDPOINT: props.rdsEndpoint }),
            ...(props.knowledgeBaseId && { KNOWLEDGE_BASE_ID: props.knowledgeBaseId }),
            /* eslint-enable @typescript-eslint/naming-convention */
        });
        corpusApiHandler.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['bedrock:Retrieve'],
                resources: [
                    `arn:aws:bedrock:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:knowledge-base/${props.knowledgeBaseId}`,
                ],
            })
        );
        props.rdsSecret?.grantRead(corpusApiHandler);
        props.baseInfra.grantSagemakerEmbeddingsModelAccess(corpusApiHandler);
        props.baseInfra.grantBedrockEmbeddingsModelAccess(corpusApiHandler);

        const embeddingResource = corpusResource.addResource('embedding', {
            defaultCorsPreflightOptions,
        });
        const embeddingDocumentsResource =
            embeddingResource.addResource('embedding-documents');
        this.addMethod(embeddingDocumentsResource, 'POST', corpusApiHandler);

        const embeddingQueryResource = embeddingResource.addResource('embedding-query', {
            defaultCorsPreflightOptions,
        });
        this.addMethod(embeddingQueryResource, 'POST', corpusApiHandler);

        return corpusApiHandler;
    }

    private createInferenceResources(
        api: apigw.RestApi,
        props: ApiProps,
        conversationLambda: lambda.IFunction,
        corpusLambda: lambda.IFunction
    ): lambda.Function {
        const inferenceResource = api.root.addResource('inference', {
            defaultCorsPreflightOptions,
        });
        const inferenceChatResource = inferenceResource.addResource('{chat_id}', {
            defaultCorsPreflightOptions,
        });
        const sendMessageResource = inferenceChatResource.addResource('message', {
            defaultCorsPreflightOptions,
        });

        const inferenceLambda = this.createLambdaHandler('inference', props, {
            /* eslint-disable @typescript-eslint/naming-convention */
            CONVERSATION_LAMBDA_FUNC_NAME: conversationLambda.functionName,
            CORPUS_LAMBDA_FUNC_NAME: corpusLambda.functionName,
            GUARDRAIL_ARN: props.baseInfra.guardrail?.attrGuardrailArn ?? '',
            /* eslint-enable @typescript-eslint/naming-convention */
        });
        props.baseInfra.grantBedrockTextModelAccess(inferenceLambda);
        props.baseInfra.grantSagemakerTextModelAccess(inferenceLambda);
        props.baseInfra.grantBedrockRerankingAccess(inferenceLambda);
        props.baseInfra.grantBedrockGuardrailAccess(inferenceLambda);

        conversationLambda.grantInvoke(inferenceLambda);
        corpusLambda.grantInvoke(inferenceLambda);
        this.addMethod(sendMessageResource, 'PUT', inferenceLambda);

        return inferenceLambda;
    }

    private createLambdaHandler(
        resourceName: string,
        props: ApiProps,
        additionalEnvs?: Record<string, string>
    ): lambda.Function {
        const apiHandler = new lambda.Function(this, `${resourceName}ApiHandler`, {
            ...constants.LAMBDA_COMMON_PROPERTIES,
            vpc: props.baseInfra.vpc,
            runtime: constants.LAMBDA_PYTHON_RUNTIME,
            memorySize: 1024,
            code: lambda.Code.fromAsset(path.join(constants.BACKEND_DIR, resourceName)),
            handler: 'lambda.handler',
            layers: [
                props.baseInfra.powerToolsLayer,
                props.baseInfra.langchainLayer,
                props.baseInfra.toolkitLayer,
            ],
            environment: {
                ...constants.LAMBDA_COMMON_ENVIRONMENT,
                /* eslint-disable @typescript-eslint/naming-convention */
                POWERTOOLS_SERVICE_NAME: `${resourceName}-api`,
                EMBEDDINGS_SAGEMAKER_MODELS: JSON.stringify(
                    props.baseInfra.systemConfig.ragConfig.embeddingsModels
                ),
                CONFIG_TABLE_NAME: props.baseInfra.configTable.tableName,
                /* eslint-enable @typescript-eslint/naming-convention */
                ...additionalEnvs,
            },
        });
        props.baseInfra.configTable.grantReadData(apiHandler);

        return apiHandler;
    }
}
