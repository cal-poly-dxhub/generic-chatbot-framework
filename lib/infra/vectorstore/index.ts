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

        // Identify configurable vs fixed-dimension models
        const modelId = embeddingModel.modelId;
        const supportsConfigurableDimensions = modelId.startsWith('amazon.titan');

        // Fixed-dimension map (extend if you add others later)
        const fixedDims: Record<string, number> = {
            'cohere.embed-multilingual-v3': 1024,
            'cohere.embed-english-v3': 1024,
        };

        const fixedDim = fixedDims[modelId];

        // Optional safety check: fail fast at synth if dimensions mismatch
        if (
            !supportsConfigurableDimensions &&
            fixedDim &&
            embeddingModel.dimensions &&
            embeddingModel.dimensions !== fixedDim
        ) {
            throw new Error(
                `Embedding model ${modelId} has fixed dimension ${fixedDim}, but you set ${embeddingModel.dimensions} in config.`
            );
        }

        // Compute the actual index dimension
        const indexDimension = supportsConfigurableDimensions
            ? embeddingModel.dimensions // you control this (e.g., 256/512/1024 for Titan v2)
            : fixedDim ?? embeddingModel.dimensions; // fall back if not in fixed map

        this.vectorIndex = new s3Vectors.Index(this, 'VectorIndex', {
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

            // KB config: include dimensions only when configurable
            // Use the same indexDimension computed above to ensure consistency
            const knowledgeBaseConfig: s3Vectors.KnowledgeBaseConfiguration =
                supportsConfigurableDimensions
                    ? {
                          embeddingModelArn,
                          embeddingDataType: 'FLOAT32',
                          dimensions: indexDimension.toString(),
                      }
                    : {
                          embeddingModelArn,
                          embeddingDataType: 'FLOAT32',
                      };

            this.knowledgeBase = new s3Vectors.KnowledgeBase(this, 'KnowledgeBase', {
                knowledgeBaseName: `fr-kb-${applicationName}`,
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
