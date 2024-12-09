/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
*/

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigw2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigw2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigw2Authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as constants from '../common/constants';
import * as path from 'path';
import { BaseInfra } from '../base-infra';

export interface WebSocketProps {
    readonly baseInfra: BaseInfra;
    readonly userPoolId: string;
    readonly appClientId: string;
    readonly inferenceLambda: lambda.Function;
}

export class WebSocket extends Construct {
    public readonly webSocketApi: apigw2.WebSocketApi;
    public readonly webSocketApiStage: apigw2.WebSocketStage;
    public readonly webSocketApiUrl: string;

    public constructor(scope: Construct, id: string, props: WebSocketProps) {
        super(scope, id);

        const wsConnectionsTable = new dynamodb.Table(this, 'WsConnectionsTable', {
            partitionKey: {
                name: 'PK',
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            pointInTimeRecovery: true,
        });

        const wsApiHandler = new lambda.Function(this, 'WsApiHandler', {
            ...constants.LAMBDA_COMMON_PROPERTIES,
            vpc: props.baseInfra.vpc,
            runtime: constants.LAMBDA_PYTHON_RUNTIME,
            memorySize: 512,
            code: lambda.Code.fromAsset(
                path.join(constants.BACKEND_DIR, 'websocket', 'handler')
            ),
            handler: 'lambda.handler',
            layers: [
                props.baseInfra.powerToolsLayer,
                props.baseInfra.langchainLayer,
                props.baseInfra.toolkitLayer,
            ],
            environment: {
                ...constants.LAMBDA_COMMON_ENVIRONMENT,

                /* eslint-disable @typescript-eslint/naming-convention */
                POWERTOOLS_SERVICE_NAME: 'ws-api',
                WS_CONNECTIONS_TABLE_NAME: wsConnectionsTable.tableName,
                INFERENCE_LAMBDA_FUNC_NAME: props.inferenceLambda.functionName,
                /* eslint-enable @typescript-eslint/naming-convention */
            },
        });
        wsConnectionsTable.grantReadWriteData(wsApiHandler);

        const authorizerHandler = new lambda.Function(this, 'WsAuthorizerHandler', {
            ...constants.LAMBDA_COMMON_PROPERTIES,
            vpc: props.baseInfra.vpc,
            runtime: constants.LAMBDA_PYTHON_RUNTIME,
            memorySize: 512,
            code: lambda.Code.fromAsset(
                path.join(constants.BACKEND_DIR, 'websocket', 'authorizer')
            ),
            handler: 'lambda.handler',
            layers: [props.baseInfra.powerToolsLayer, props.baseInfra.wsAuthorizerLayer],
            environment: {
                ...constants.LAMBDA_COMMON_ENVIRONMENT,

                /* eslint-disable @typescript-eslint/naming-convention */
                POWERTOOLS_SERVICE_NAME: 'ws-authorizer',
                COGNITO_USER_POOL_ID: props.userPoolId,
                COGNITO_APP_CLIENT_ID: props.appClientId,
                WS_CONNECTIONS_TABLE_NAME: wsConnectionsTable.tableName,
                /* eslint-enable @typescript-eslint/naming-convention */
            },
        });
        wsConnectionsTable.grantReadWriteData(authorizerHandler);

        const authorizer = new apigw2Authorizers.WebSocketLambdaAuthorizer(
            'Authorizer',
            authorizerHandler,
            {
                identitySource: ['route.request.querystring.idToken'],
            }
        );

        const webSocketApi = new apigw2.WebSocketApi(this, 'WsApi', {
            apiName: `${props.baseInfra.solutionInfo.solutionName} WebSocket API`,
            routeSelectionExpression: '$request.body.route',
            connectRouteOptions: {
                authorizer,
                integration: new apigw2Integrations.WebSocketLambdaIntegration(
                    'ConnectHandler',
                    wsApiHandler
                ),
            },
            disconnectRouteOptions: {
                integration: new apigw2Integrations.WebSocketLambdaIntegration(
                    'DisconnectHandler',
                    wsApiHandler
                ),
            },
            defaultRouteOptions: {
                integration: new apigw2Integrations.WebSocketLambdaIntegration(
                    'DefaultHandler',
                    wsApiHandler
                ),
            },
        });

        const sendMessageIntegration = new apigw2Integrations.WebSocketLambdaIntegration(
            'SendMessageHandler',
            wsApiHandler
        );
        webSocketApi.addRoute('SendChatMessage', {
            integration: sendMessageIntegration,
        });

        const webSocketApiStage = new apigw2.WebSocketStage(this, 'ProdStage', {
            webSocketApi,
            stageName: 'prod',
            autoDeploy: true,
        });
        this.webSocketApiStage = webSocketApiStage;

        this.webSocketApi = webSocketApi;
        this.webSocketApiUrl = `https://${webSocketApi.apiId}.execute-api.${cdk.Aws.REGION}.amazonaws.com/${webSocketApiStage.stageName}`;

        // Update inference lambda with necessary permissions and environment variables to access websocket resources
        wsConnectionsTable.grantReadData(props.inferenceLambda);
        props.inferenceLambda.grantInvoke(wsApiHandler);
        props.inferenceLambda.addEnvironment(
            'WEBSOCKET_CALLBACK_URL',
            this.webSocketApiUrl
        );
        props.inferenceLambda.addEnvironment(
            'WS_CONNECTIONS_TABLE_NAME',
            wsConnectionsTable.tableName
        );
        props.inferenceLambda.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['execute-api:Invoke', 'execute-api:ManageConnections'],
                resources: [
                    `arn:aws:execute-api:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:${webSocketApi.apiId}/*/*`,
                ],
            })
        );
    }
}
