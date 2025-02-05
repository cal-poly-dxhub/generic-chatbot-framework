/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
*/

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3deployment from 'aws-cdk-lib/aws-s3-deployment';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { SolutionInfo, SystemConfig } from '../common/types';
import { BaseInfra } from '../base-infra';
import { PgVectorStore } from '../vectorstore/pg-vectorstore';
import { Authentication } from '../auth';
import { Frontend } from '../frontend';
import { Api } from '../api';
import * as path from 'path';
import * as constants from '../common/constants';
import { IngestionPipeline } from '../ingestion/pipeline';
import { ConversationStore } from '../conversation-store';
import { OpenSearchVectorStore } from '../vectorstore/opensearch-vectorstore';
import { KnowledgeBase } from '../knowledgebase';

export interface FrancisChatbotStackProps extends cdk.StackProps {
    readonly systemConfig: SystemConfig;
    readonly solutionInfo: SolutionInfo;
}

export class FrancisChatbotStack extends cdk.Stack {
    public constructor(scope: Construct, id: string, props: FrancisChatbotStackProps) {
        super(scope, id, props);

        const removalPolicy = props.systemConfig.retainData
            ? cdk.RemovalPolicy.RETAIN
            : cdk.RemovalPolicy.DESTROY;

        const adminUserEmailParam = new cdk.CfnParameter(this, 'adminUserEmail', {
            type: 'String',
            description: `Admin user email address`,
            allowedPattern:
                '^[_A-Za-z0-9-\\+]+(\\.[_A-Za-z0-9-]+)*@[A-Za-z0-9-]+(\\.[A-Za-z0-9]+)*(\\.[A-Za-z]{2,})$',
            constraintDescription: 'Admin user email must be a valid email address',
            minLength: 5,
        });

        const baseInfra = new BaseInfra(this, 'BaseInfra', {
            systemConfig: props.systemConfig,
            solutionInfo: props.solutionInfo,
        });

        const frontend = new Frontend(this, 'Frontend', {
            baseInfra,
            accessLogsBucket: baseInfra.serverAccessLogsBucket,
        });

        const conversationStore = new ConversationStore(this, 'ConversationStore', {
            baseInfra,
        });

        const authentication = new Authentication(this, 'Authentication', {
            adminEmail: adminUserEmailParam.valueAsString,
            cloudFrontDomainName: frontend.cloudFrontDistribution.distributionDomainName,
            solutionInfo: props.solutionInfo,
            removalPolicy,
        });

        // Bucket containing the inputs assets (documents - multiple modalities) uploaded by the user
        const inputAssetsBucket = new s3.Bucket(this, 'InputAssetsBucket', {
            ...constants.BUCKET_COMMON_PROPERTIES,
            serverAccessLogsBucket: baseInfra.serverAccessLogsBucket,
        });

        const apiProps = {};

        if (
            baseInfra.systemConfig.ragConfig.corpusConfig?.corpusType == 'knowledgebase'
        ) {
            const bedrockRole = new iam.Role(this, 'BedrockExecutionRole', {
                assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
            });

            const vectorStore = new OpenSearchVectorStore(this, 'OpenSearchVectorStore', {
                baseInfra,
                dataAccessRoles: [bedrockRole],
            });

            const knowledgeBase = new KnowledgeBase(this, 'KnolwedgeBase', {
                baseInfra,
                bedrockRole,
                vectorStore,
                inputAssetsBucket,
            });

            knowledgeBase.knowledgeBase.node.addDependency(
                vectorStore.opensearchSetupHandler
            );

            Object.assign(apiProps, {
                knowledgeBaseId: knowledgeBase.knowledgeBase.attrKnowledgeBaseId,
            });
        } else {
            const vectorStore = new PgVectorStore(this, 'PgVectorStore', {
                baseInfra,
            });

            new IngestionPipeline(this, 'IngestionPipeline', {
                baseInfra,
                inputAssetsBucket,
                rdsSecret: vectorStore.cluster.secret!,
                rdsEndpoint: vectorStore.rdsEndpoint,
            });

            Object.assign(apiProps, {
                rdsSecret: vectorStore.cluster.secret!,
                rdsEndpoint: vectorStore.rdsEndpoint,
            });
        }

        Object.assign(apiProps, {
            modelId: props.systemConfig.handoffConfig.handoffModelConfig?.modelId ?? '',
        });

        const api = new Api(this, 'Api', {
            baseInfra,
            authentication,
            conversationTable: conversationStore.conversationTable,
            ...apiProps,
        });

        // Allow inference lambda to read the promotion image in the input asset
        inputAssetsBucket.grantRead(api.inferenceLambda);

        new s3deployment.BucketDeployment(this, 'FrontendDeployment', {
            sources: [
                s3deployment.Source.asset(
                    path.resolve(__dirname, '../../../frontend/build')
                ),
                s3deployment.Source.jsonData('runtime-config.json', {
                    apiUrl: api.restApi.url,
                    wsApiUrl: api.webSocket.webSocketApiStage.url,
                    region: cdk.Aws.REGION,
                    identityPoolId: authentication.identityPool.identityPoolId,
                    userPoolId: authentication.userPool.userPoolId,
                    userPoolWebClientId: authentication.appClientId,
                    useStreaming: props.systemConfig.llmConfig.streaming ?? false,
                }),
            ],
            destinationBucket: frontend.assetBucket,
            distribution: frontend.cloudFrontDistribution,
        });

        new cdk.CfnOutput(this, 'CloudFrontDomain', {
            value: frontend.cloudFrontDistribution.distributionDomainName,
        });
        new cdk.CfnOutput(this, 'UserPoolId', {
            value: authentication.userPool.userPoolId,
        });
        new cdk.CfnOutput(this, 'InputBucket', {
            value: inputAssetsBucket.bucketName,
        });

        new cdk.CfnOutput(this, 'WebSocketApiUrl', {
            value: api.webSocket.webSocketApiUrl,
        });
    }
}
