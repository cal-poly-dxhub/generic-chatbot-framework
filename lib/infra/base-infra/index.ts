/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
*/

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as sagemaker from '@aws-cdk/aws-sagemaker-alpha';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as path from 'path';
import * as ddb_util from '@aws-sdk/util-dynamodb';
import { Construct } from 'constructs';
import * as constants from '../common/constants';
import { SolutionInfo, SystemConfig } from '../common/types';
import { Layer } from './layer';
import { WafWebAcl } from '../waf';

export interface BaseInfraProps {
    readonly solutionInfo: SolutionInfo;
    readonly systemConfig: SystemConfig;
}

export class BaseInfra extends Construct {
    public readonly vpc: ec2.Vpc;
    public readonly serverAccessLogsBucket: s3.IBucket;
    public readonly powerToolsLayer: lambda.ILayerVersion;
    public readonly langchainLayer: lambda.ILayerVersion;
    public readonly toolkitLayer: lambda.ILayerVersion;
    public readonly wsAuthorizerLayer: lambda.ILayerVersion;
    public readonly solutionInfo: SolutionInfo;
    public readonly systemConfig: SystemConfig;
    public readonly configTable: ddb.Table;
    public readonly webAcl?: wafv2.CfnWebACL;
    public readonly removalPolicy?: cdk.RemovalPolicy;
    public readonly guardrail?: bedrock.CfnGuardrail;

    public constructor(scope: Construct, id: string, props: BaseInfraProps) {
        super(scope, id);

        this.solutionInfo = props.solutionInfo;
        this.systemConfig = props.systemConfig;
        this.removalPolicy = props.systemConfig.retainData
            ? cdk.RemovalPolicy.RETAIN
            : cdk.RemovalPolicy.DESTROY;

        this.vpc = new ec2.Vpc(this, 'Vpc', {
            subnetConfiguration: [
                {
                    name: 'public',
                    cidrMask: 24,
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    name: 'private',
                    cidrMask: 24,
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                },
                {
                    name: 'isolated',
                    cidrMask: 28,
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                },
            ],
        });

        this.enableVcpFlowLog(this.vpc);
        this.createVpcEndpoints(this.vpc);

        this.configTable = this.initConfigTable(props);

        this.serverAccessLogsBucket = new s3.Bucket(this, 'AccessLogsBucket', {
            ...constants.BUCKET_COMMON_PROPERTIES,
            objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
            accessControl: s3.BucketAccessControl.LOG_DELIVERY_WRITE,
            encryption: s3.BucketEncryption.S3_MANAGED,
        });

        const powerToolsArn =
            constants.LAMBDA_ARCHITECTURE === lambda.Architecture.X86_64
                ? `arn:${cdk.Aws.PARTITION}:lambda:${cdk.Aws.REGION}:017000801446:layer:AWSLambdaPowertoolsPythonV3-${constants.LAMBDA_POWERTOOLS_PYTHON_VERSION}-x86_64:${constants.LAMBDA_POWERTOOLS_LAYER_VERSION}`
                : `arn:${cdk.Aws.PARTITION}:lambda:${cdk.Aws.REGION}:017000801446:layer:AWSLambdaPowertoolsPythonV3-${constants.LAMBDA_POWERTOOLS_PYTHON_VERSION}-arm64:${constants.LAMBDA_POWERTOOLS_LAYER_VERSION}`;
        this.powerToolsLayer = lambda.LayerVersion.fromLayerVersionArn(
            this,
            'PowertoolsLayer',
            powerToolsArn
        );

        this.langchainLayer = new Layer(this, 'LangchainLayer', {
            path: path.join(constants.BACKEND_DIR, 'layers', 'langchain-layer'),
            runtime: constants.LAMBDA_PYTHON_RUNTIME,
            architecture: constants.LAMBDA_ARCHITECTURE,
            description:
                'Dependencies to build gen ai applications with the langchain client',
        }).layer;

        this.wsAuthorizerLayer = new Layer(this, 'WsAuthorizerLayer', {
            path: path.join(constants.BACKEND_DIR, 'layers', 'ws-authorizer-layer'),
            runtime: constants.LAMBDA_PYTHON_RUNTIME,
            architecture: constants.LAMBDA_ARCHITECTURE,
            description: 'Dependencies to run authorizer function for websocket',
        }).layer;

        this.toolkitLayer = new lambda.LayerVersion(this, 'ToolkitLayer', {
            code: lambda.Code.fromAsset(
                path.join(constants.BACKEND_DIR, 'layers', 'toolkit-layer')
            ),
            description: 'Utilities to instantiate a pgvector and sagemaker embeddings.',
            ...props,
        });

        if (props.systemConfig.wafConfig?.enableApiGatewayWaf) {
            this.webAcl = new WafWebAcl(this, 'WafWebACL', {
                wafName: `FrancisApiWebAcl${props.systemConfig.applicationName ?? ''}`,
                allowedExternalIPRanges:
                    props.systemConfig.wafConfig.allowedExternalIpAranges,
            }).webAcl;
        }

        if (props.systemConfig.llmConfig.guardrailConfig) {
            const config = props.systemConfig.llmConfig.guardrailConfig;
            this.guardrail = new bedrock.CfnGuardrail(this, 'ContentSafetyGuardrail', {
                name: 'francis-chatbot-safety',
                blockedInputMessaging: config.blockedMessages.input,
                blockedOutputsMessaging: config.blockedMessages.output,
                contentPolicyConfig: config.contentFilters && {
                    filtersConfig: config.contentFilters.map((filter) => ({
                        inputStrength: filter.inputStrength,
                        outputStrength: filter.outputStrength,
                        type: filter.type,
                    })),
                },
                sensitiveInformationPolicyConfig: config.piiFilters && {
                    piiEntitiesConfig: config.piiFilters.map((filter) => ({
                        action: filter.action,
                        type: filter.type,
                    })),
                },
            });

            this.guardrail.applyRemovalPolicy(
                props.systemConfig.retainData
                    ? cdk.RemovalPolicy.RETAIN
                    : cdk.RemovalPolicy.DESTROY
            );
        }
    }

    private enableVcpFlowLog(vpc: ec2.IVpc): void {
        const logGroup = new logs.LogGroup(this, 'FLowLogsLogGroup', {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        new ec2.FlowLog(this, 'FlowLog', {
            resourceType: ec2.FlowLogResourceType.fromVpc(vpc),
            destination: ec2.FlowLogDestination.toCloudWatchLogs(logGroup),
        });
    }

    private createVpcEndpoints(vpc: ec2.IVpc): void {
        const s3GatewayEndpoint = vpc.addGatewayEndpoint('S3GatewayEndpoint', {
            service: ec2.GatewayVpcEndpointAwsService.S3,
        });

        const s3vpcEndpoint = vpc.addInterfaceEndpoint('S3InterfaceEndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.S3,
            privateDnsEnabled: true,
            open: true,
        });

        s3vpcEndpoint.node.addDependency(s3GatewayEndpoint);

        vpc.addGatewayEndpoint('DynamoDBEndpoint', {
            service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
        });

        vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
            privateDnsEnabled: true,
            open: true,
        });

        vpc.addInterfaceEndpoint('SageMakerRuntimeEndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.SAGEMAKER_RUNTIME,
            privateDnsEnabled: true,
            open: true,
        });

        vpc.addInterfaceEndpoint('BedrockEndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.BEDROCK,
            privateDnsEnabled: true,
            open: true,
        });

        vpc.addInterfaceEndpoint('BedrockRuntimeEndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.BEDROCK_RUNTIME,
            privateDnsEnabled: true,
            open: true,
        });
    }

    // Persist system configuration into DynamoDB
    private initConfigTable(props: BaseInfraProps): ddb.Table {
        const configTable = new ddb.Table(this, 'ConfigTable', {
            partitionKey: { name: 'PK', type: ddb.AttributeType.STRING },
            encryption: ddb.TableEncryption.AWS_MANAGED,
            billingMode: ddb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecovery: true,
            removalPolicy: this.removalPolicy,
        });

        const item = {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            PK: { S: 'system_configuration' },
            ...ddb_util.marshall(props.systemConfig),
        };

        const customResource = new cr.AwsCustomResource(
            this,
            'ConfigTableCustomResource',
            {
                onUpdate: {
                    service: 'DynamoDB',
                    action: 'putItem',
                    physicalResourceId: cr.PhysicalResourceId.of(
                        configTable.tableName + '_insert'
                    ),
                    parameters: {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        TableName: configTable.tableName,
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        Item: item,
                    },
                },
                policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
                    resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
                }),
            }
        );
        customResource.node.addDependency(configTable);

        return configTable;
    }

    public grantSagemakerEmbeddingsModelAccess(lambdaFunc: lambda.IFunction): void {
        const endpointSet = new Set<string>();
        const sagemakerEndpoints: sagemaker.IEndpoint[] = [];

        this.systemConfig.ragConfig.embeddingsModels.forEach((model) => {
            if (model.provider === 'sagemaker') {
                if (!endpointSet.has(model.modelEndpointName)) {
                    endpointSet.add(model.modelEndpointName);
                    sagemakerEndpoints.push(
                        sagemaker.Endpoint.fromEndpointName(
                            this,
                            `SagemakerEndpoint${endpointSet.size}`,
                            model.modelEndpointName
                        )
                    );
                }
            }
        });

        sagemakerEndpoints.forEach((endpoint) => {
            lambdaFunc.addToRolePolicy(
                new iam.PolicyStatement({
                    actions: [
                        'sagemaker:InvokeEndpoint',
                        'sagemaker:InvokeEndpointWithResponseStream',
                    ],
                    resources: [endpoint.endpointArn],
                })
            );
        });
    }

    public grantSagemakerTextModelAccess(lambdaFunc: lambda.IFunction): void {
        const endpointSet = new Set<string>();
        const sagemakerEndpoints: sagemaker.IEndpoint[] = [];

        const chains = [
            this.systemConfig.llmConfig.qaChainConfig,
            this.systemConfig.llmConfig.classificationChainConfig,
            this.systemConfig.llmConfig.standaloneChainConfig,
        ];

        chains.forEach((chain) => {
            if (chain && chain.modelConfig.provider == 'sagemaker') {
                if (!endpointSet.has(chain.modelConfig.modelEndpointName)) {
                    endpointSet.add(chain.modelConfig.modelEndpointName);
                    sagemakerEndpoints.push(
                        sagemaker.Endpoint.fromEndpointName(
                            this,
                            `SagemakerEndpoint${endpointSet.size}`,
                            chain.modelConfig.modelEndpointName
                        )
                    );
                }
            }
        });

        sagemakerEndpoints.forEach((endpoint) => {
            lambdaFunc.addToRolePolicy(
                new iam.PolicyStatement({
                    actions: ['sagemaker:InvokeEndpoint'],
                    resources: [endpoint.endpointArn],
                })
            );
        });
    }

    public grantBedrockEmbeddingsModelAccess(lambdaFunc: lambda.IFunction): void {
        const regionModelIds = new Map<string, Set<string>>();

        this.systemConfig.ragConfig.embeddingsModels.map((model) => {
            if (model.provider === 'bedrock') {
                const region = model.region ?? cdk.Aws.REGION;
                const modelIds = regionModelIds.get(region) ?? new Set<string>();
                modelIds.add(model.modelId);
                regionModelIds.set(region, modelIds);
            }
        });

        this.grantBedrockModelAccess(lambdaFunc, regionModelIds);
    }

    public grantBedrockRerankingAccess(lambdaFunc: lambda.IFunction): void {
        if (
            this.systemConfig.llmConfig.rerankingConfig?.modelConfig.provider !==
            'bedrock'
        ) {
            return;
        }

        const config = this.systemConfig.llmConfig.rerankingConfig;
        const region = config.modelConfig.region ?? cdk.Aws.REGION;

        lambdaFunc.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['bedrock:Rerank'],
                resources: ['*'],
            })
        );

        const regionModelIds = new Map<string, Set<string>>([
            [region, new Set([config.modelConfig.modelId])],
        ]);
        this.grantBedrockModelAccess(lambdaFunc, regionModelIds);
    }

    public grantBedrockGuardrailAccess(lambdaFunc: lambda.IFunction): void {
        if (this.guardrail) {
            lambdaFunc.addToRolePolicy(
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['bedrock:ApplyGuardrail'],
                    resources: [this.guardrail.attrGuardrailArn],
                })
            );
        }
    }
    public grantBedrockTextModelAccess(lambdaFunc: lambda.IFunction): void {
        const regionModelIds = new Map<string, Set<string>>();

        const chains = [
            this.systemConfig.llmConfig.standaloneChainConfig,
            this.systemConfig.llmConfig.classificationChainConfig,
            this.systemConfig.llmConfig.qaChainConfig,
        ];
        chains.forEach((chain) => {
            if (chain && chain.modelConfig.provider === 'bedrock') {
                const region = chain.modelConfig.region ?? cdk.Aws.REGION;
                const modelIds = regionModelIds.get(region) ?? new Set<string>();
                modelIds.add(chain.modelConfig.modelId);
                regionModelIds.set(region, modelIds);
            }
        });

        this.grantBedrockModelAccess(lambdaFunc, regionModelIds);
    }

    public grantBedrockHandoffModelAccess(lambdaFunc: lambda.IFunction): void {
        if (this.systemConfig.handoffConfig?.modelConfig.provider !== 'bedrock') {
            return;
        }

        const region =
            this.systemConfig.handoffConfig.modelConfig.region ?? cdk.Aws.REGION;
        const regionModelIds = new Map<string, Set<string>>([
            [region, new Set([this.systemConfig.handoffConfig.modelConfig.modelId])],
        ]);

        this.grantBedrockModelAccess(lambdaFunc, regionModelIds);
    }

    public grantBedrockModelAccess(
        lambdaFunc: lambda.IFunction,
        regionModelIds: Map<string, Set<string>>
    ): void {
        regionModelIds.forEach((modelIds, region) => {
            lambdaFunc.addToRolePolicy(
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'bedrock:InvokeModel',
                        'bedrock:InvokeModelWithResponseStream',
                    ],
                    resources: Array.from(modelIds).flatMap((modelId) => {
                        // Check if the modelId is an inference profile
                        const isInferenceProfile = /^(us\.|eu\.|apac\.|us-gov\.)/.test(
                            modelId
                        );
                        if (isInferenceProfile) {
                            // Remove the prefix (us./eu./apac.) from modelId
                            const baseModelId = modelId.replace(
                                /^(us\.|eu\.|apac\.|us-gov\.)/,
                                ''
                            );

                            return [
                                `arn:${cdk.Aws.PARTITION}:bedrock:${region}:${cdk.Aws.ACCOUNT_ID}:inference-profile/${modelId}`,
                                `arn:${cdk.Aws.PARTITION}:bedrock:*::foundation-model/${baseModelId}`,
                            ];
                        } else {
                            return `arn:${cdk.Aws.PARTITION}:bedrock:${region}::foundation-model/${modelId}`;
                        }
                    }),
                })
            );
        });
    }
}
