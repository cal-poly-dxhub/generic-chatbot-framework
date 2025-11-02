/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
*/

import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3Vectors from 'cdk-s3-vectors';
import { Construct } from 'constructs';
import { BaseInfra } from '../base-infra';
import { S3VectorStoreConfig } from '../common/types';

export interface S3VectorStoreProps {
    readonly baseInfra: BaseInfra;
    readonly documentBucket?: s3.IBucket;
}

export class S3VectorStore extends Construct {
    public readonly vectorBucket: s3Vectors.Bucket;
    public readonly vectorIndex: s3Vectors.Index;
    public readonly knowledgeBase?: s3Vectors.KnowledgeBase;
    public readonly dataSource?: bedrock.CfnDataSource;

    public constructor(scope: Construct, id: string, props: S3VectorStoreProps) {
        super(scope, id);

        const applicationName = props.baseInfra.systemConfig.applicationName ?? 'default';
        const vectorStoreConfig = props.baseInfra.systemConfig.ragConfig
            .vectorStoreConfig as S3VectorStoreConfig;

        // Create vector bucket
        const vectorBucketName = `fr-vectors-${applicationName}`;
        this.vectorBucket = new s3Vectors.Bucket(this, 'VectorBucket', {
            vectorBucketName,
            encryptionConfiguration: vectorStoreConfig.vectorStoreProperties
                ?.encryptionConfiguration
                ? {
                      sseType:
                          vectorStoreConfig.vectorStoreProperties.encryptionConfiguration
                              .sseType,
                      kmsKey: vectorStoreConfig.vectorStoreProperties
                          .encryptionConfiguration.kmsKey,
                  }
                : undefined,
        });

        // Create vector index
        const indexName = `fr-index-${applicationName}`;
        const embeddingModel = props.baseInfra.systemConfig.ragConfig.embeddingsModels[0];

        // Compute the index dimension directly from config
        const modelId = embeddingModel.modelId;
        const indexDimension = embeddingModel.dimensions;

        // Use different construct ID when metadata config is present to force new index creation
        // This allows CloudFormation to create new resources when metadata configuration changes
        const indexConstructId = vectorStoreConfig.vectorStoreProperties
            ?.metadataConfiguration?.nonFilterableMetadataKeys
            ? 'VectorIndexWithMetadataConfig'
            : 'VectorIndex';

        this.vectorIndex = new s3Vectors.Index(this, indexConstructId, {
            vectorBucketName: this.vectorBucket.vectorBucketName,
            indexName,
            dataType: 'float32',
            dimension: indexDimension,
            distanceMetric:
                vectorStoreConfig.vectorStoreProperties?.distanceMetric ?? 'cosine',
            metadataConfiguration: vectorStoreConfig.vectorStoreProperties
                ?.metadataConfiguration
                ? {
                      nonFilterableMetadataKeys:
                          vectorStoreConfig.vectorStoreProperties.metadataConfiguration
                              .nonFilterableMetadataKeys,
                  }
                : undefined,
        });

        // Add dependency for vector index
        this.vectorIndex.node.addDependency(this.vectorBucket);

        // Create knowledge base if using knowledge base corpus config
        const corpusConfig = props.baseInfra.systemConfig.ragConfig.corpusConfig;
        if (corpusConfig && corpusConfig.corpusType === 'knowledgebase') {
            // Get embedding model ARN
            const region = cdk.Stack.of(this).region;
            const embeddingModelArn = `arn:aws:bedrock:${region}::foundation-model/${modelId}`;

            // KB config: set dimensions explicitly based on configured indexDimension
            const knowledgeBaseConfig: s3Vectors.KnowledgeBaseConfiguration = {
                embeddingModelArn,
                embeddingDataType: 'FLOAT32',
                dimensions: indexDimension.toString(),
            };

            // Knowledge Base storage configuration cannot be modified after creation.
            // When metadata config is added, the old KB must be manually deleted first.
            const knowledgeBaseName = `fr-kb-${applicationName}`;

            // Use different construct ID when metadata config is present to force new KB creation
            // This allows CloudFormation to create new resources when metadata configuration changes
            const kbConstructId = vectorStoreConfig.vectorStoreProperties
                ?.metadataConfiguration?.nonFilterableMetadataKeys
                ? 'KnowledgeBaseWithMetadataConfig'
                : 'KnowledgeBase';

            this.knowledgeBase = new s3Vectors.KnowledgeBase(this, kbConstructId, {
                knowledgeBaseName,
                vectorBucketArn: this.vectorBucket.vectorBucketArn,
                indexArn: this.vectorIndex.indexArn,
                knowledgeBaseConfiguration: knowledgeBaseConfig,
                description: 'Knowledge base using S3 Vectors for Francis chatbot',
            });

            // Add dependencies
            this.knowledgeBase.node.addDependency(this.vectorIndex);
            this.knowledgeBase.node.addDependency(this.vectorBucket);

            // Create data source if document bucket is provided
            if (props.documentBucket) {
                this.dataSource = new bedrock.CfnDataSource(this, 'DataSource', {
                    name: `fr-datasource-${applicationName}`,
                    knowledgeBaseId: this.knowledgeBase.knowledgeBaseId,
                    dataSourceConfiguration: {
                        type: 'S3',
                        s3Configuration: {
                            bucketArn: props.documentBucket.bucketArn,
                        },
                    },
                });

                this.dataSource.node.addDependency(this.knowledgeBase);

                // Grant knowledge base role read access to document bucket
                props.documentBucket.grantRead(this.knowledgeBase.role);
            }
        }
    }

    /**
     * Grants read permissions to S3 vector resources
     */
    public grantVectorRead(grantee: iam.IGrantable): void {
        // Grant permissions to query vectors from the index
        grantee.grantPrincipal.addToPrincipalPolicy(
            new iam.PolicyStatement({
                actions: ['s3vectors:QueryVectors', 's3vectors:GetVectors'],
                resources: [this.vectorIndex.indexArn],
            })
        );
        // Also grant list indexes permission on the bucket
        this.vectorBucket.grantListIndexes(grantee);
    }

    /**
     * Grants write permissions to S3 vector resources
     */
    public grantVectorWrite(grantee: iam.IGrantable): void {
        this.vectorIndex.grantWrite(grantee);
    }

    /**
     * Grants knowledge base query permissions
     */
    public grantKnowledgeBaseQuery(grantee: iam.IGrantable): void {
        if (this.knowledgeBase) {
            grantee.grantPrincipal.addToPrincipalPolicy(
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['bedrock:Retrieve', 'bedrock:RetrieveAndGenerate'],
                    resources: [this.knowledgeBase.knowledgeBaseArn],
                })
            );
        }
    }
}
