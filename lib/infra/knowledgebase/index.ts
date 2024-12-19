/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
*/
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import { Construct } from 'constructs';
import { BaseInfra } from '../base-infra';
import { OpenSearchVectorStore } from '../vectorstore/opensearch-vectorstore';
import { NagSuppressions } from 'cdk-nag';

export interface KnowledgeBaseProps {
    baseInfra: BaseInfra;
    vectorStore: OpenSearchVectorStore;
    bedrockRole: iam.IRole;
    inputAssetsBucket: s3.IBucket;
}

export class KnowledgeBase extends Construct {
    public readonly knowledgeBase: bedrock.CfnKnowledgeBase;

    public constructor(scope: Construct, id: string, props: KnowledgeBaseProps) {
        super(scope, id);

        const applicationName = props.baseInfra.systemConfig.applicationName ?? 'default';

        const embeddingModelId =
            props.baseInfra.systemConfig.ragConfig.embeddingsModels[0].modelId;

        const embeddingModelArn = `arn:${cdk.Aws.PARTITION}:bedrock:${cdk.Aws.REGION}::foundation-model/${embeddingModelId}`;

        // Add required permissions to the Bedrock role
        props.bedrockRole.addToPrincipalPolicy(
            new iam.PolicyStatement({
                actions: ['bedrock:InvokeModel'],
                resources: [embeddingModelArn],
            })
        );
        props.bedrockRole.addToPrincipalPolicy(
            new iam.PolicyStatement({
                actions: ['s3:GetObject', 's3:ListBucket'],
                resources: [
                    `${props.inputAssetsBucket.bucketArn}/*`,
                    `${props.inputAssetsBucket.bucketArn}`,
                ],
            })
        );
        props.bedrockRole.addToPrincipalPolicy(
            new iam.PolicyStatement({
                actions: ['aoss:APIAccessAll'],
                resources: [props.vectorStore.collection.attrArn],
            })
        );

        NagSuppressions.addResourceSuppressions(
            props.bedrockRole,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'Need to access the S3 bucket and the aoss collection',
                },
            ],
            true
        );

        // Create the knowledge base
        this.knowledgeBase = new cdk.aws_bedrock.CfnKnowledgeBase(this, 'KnowledgeBase', {
            name: `fr-kb-${applicationName}`,
            description: 'KnowledgeBase for Francis Chatbot',
            roleArn: props.bedrockRole.roleArn,
            knowledgeBaseConfiguration: {
                type: 'VECTOR',
                vectorKnowledgeBaseConfiguration: {
                    embeddingModelArn,
                },
            },
            storageConfiguration: {
                type: 'OPENSEARCH_SERVERLESS',
                opensearchServerlessConfiguration: {
                    collectionArn: props.vectorStore.collection.attrArn,
                    vectorIndexName: `fr-idx-${applicationName}`,
                    fieldMapping: {
                        vectorField: 'vector',
                        textField: 'text',
                        metadataField: 'text-metadata',
                    },
                },
            },
        });

        // Create knowledgebase datasource
        new bedrock.CfnDataSource(this, id, {
            knowledgeBaseId: this.knowledgeBase.attrKnowledgeBaseId,
            name: `fr-ds-${applicationName}`,
            dataSourceConfiguration: {
                type: 'S3',
                s3Configuration: {
                    bucketArn: props.inputAssetsBucket.bucketArn,
                },
            },
            vectorIngestionConfiguration: {
                chunkingConfiguration: (props.baseInfra.systemConfig.ragConfig
                    .corpusConfig?.corpusProperties?.chunkingConfiguration || {
                    chunkingStrategy: 'FIXED_SIZE',
                    fixedSizeChunkingConfiguration: {
                        maxTokens: 512,
                        overlapPercentage: 20,
                    },
                }) as bedrock.CfnDataSource.ChunkingConfigurationProperty,
            },
        });

        new cdk.CfnOutput(this, 'KnowledgeBaseId', {
            value: this.knowledgeBase.attrKnowledgeBaseId,
        });
    }
}
