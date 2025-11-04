/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
*/

import * as cdk from 'aws-cdk-lib';
import * as s3deployment from 'aws-cdk-lib/aws-s3-deployment';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { SolutionInfo, SystemConfig } from '../common/types';
import { BaseInfra } from '../base-infra';
import { Authentication } from '../auth';
import { Frontend } from '../frontend';
import { Api } from '../api';
import * as path from 'path';
import * as constants from '../common/constants';
import { ConversationStore } from '../conversation-store';
import { S3VectorStore } from '../vectorstore';
import { NagSuppressions } from 'cdk-nag';

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

        // Create S3 Vectors infrastructure
        const s3VectorStore = new S3VectorStore(this, 'S3VectorStore', {
            baseInfra,
            documentBucket: inputAssetsBucket,
        });

        const api = new Api(this, 'Api', {
            baseInfra,
            authentication,
            conversationTable: conversationStore.conversationTable,
            s3VectorStore,
        });

        // Allow inference lambda to read the promotion image in the input asset
        inputAssetsBucket.grantRead(api.inferenceLambda);

        const frontendDeployment = new s3deployment.BucketDeployment(
            this,
            'FrontendDeployment',
            {
                sources: [
                    s3deployment.Source.asset(
                        path.resolve(__dirname, '../../../frontend/build'),
                        {
                            exclude: ['**/*.map', '**/*.LICENSE.txt'],
                        }
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
                memoryLimit: 3008, // Max Lambda memory (3008 MiB) for better network throughput
                ephemeralStorageSize: cdk.Size.mebibytes(1024), // Helps with large zip operations
                exclude: ['**/*.map', '**/*.LICENSE.txt'], // Belt and suspenders: exclude unnecessary files
            }
        );

        // Add cdk-nag suppressions directly to the BucketDeployment construct
        // This avoids issues with dynamic resource IDs that change based on configuration
        NagSuppressions.addResourceSuppressions(
            frontendDeployment,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'CDK deployment resources are managed by CDK',
                },
                {
                    id: 'AwsSolutions-IAM4',
                    reason: 'CDK deployment resources are managed by CDK, it uses AWSLambdaBasicExecutionRole managed policy',
                },
                {
                    id: 'AwsSolutions-L1',
                    reason: "CDK deployment resources are managed by CDK, can't control the runtime version",
                },
            ],
            true
        );

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
