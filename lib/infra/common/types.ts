/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
*/
/* eslint-disable @typescript-eslint/naming-convention */

export interface SolutionInfo {
    readonly solutionName: string;
    readonly solutionVersion: string;
}

export type VectorStoreType = 'pgvector';

export interface PgVectorStoreConfig {
    readonly vectorStoreType: 'pgvector';
    readonly vectorStoreProperties?: {
        /**
         * Minimum capacity for serverless cluster; 1 unit = 2GB
         * @default 1 (2GB)
         */
        readonly minCapacity?: number;

        /**
         * Maximum capacity for serverless cluster; 1 unit = 2GB
         * @default 50 (100GB)
         */
        readonly maxCapacity?: number;

        readonly useRDSProxy?: boolean;
    };
}

export type VectorStoreConfig = PgVectorStoreConfig;

export type ModelProvider = 'sagemaker' | 'bedrock';

export interface ModelBase {
    readonly provider: ModelProvider;
    readonly modelId: string;
    readonly region?: string;
}

export interface LLMModelBase extends ModelBase {
    readonly modelKwargs?: ModelKwargs;
}

export interface BedRockLLMModel extends LLMModelBase {
    readonly provider: 'bedrock';
}

export interface SageMakerLLMModel extends LLMModelBase {
    readonly provider: 'sagemaker';
    readonly modelEndpointName: string;
}

export interface EmbeddingModelBase extends ModelBase {
    readonly dimensions: number;
    readonly modelRefKey: string;
}

export interface SageMakerEmbeddingModel extends EmbeddingModelBase {
    readonly provider: 'sagemaker';
    readonly modelEndpointName: string;
}

export interface BedRockEmbeddingModel extends EmbeddingModelBase {
    readonly provider: 'bedrock';
}

export type EmbeddingModel = SageMakerEmbeddingModel | BedRockEmbeddingModel;

export type LLMModel = SageMakerLLMModel | BedRockLLMModel;

export interface ModelKwargs {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stopSequences?: string[];
}

export interface LLMChainConfig {
    modelConfig: LLMModel;
    promptTemplate: string;
    promptVariables?: string[];
    kwargs?: Record<string, unknown>;
}

export interface LLMConfig {
    streaming?: boolean;
    maxConversationHistory?: number;
    maxCorpusDocuments?: number;
    corpusSimilarityThreshold?: number;
    qaChainConfig: LLMChainConfig;
    standaloneChainConfig?: LLMChainConfig;
    classificationChainConfig?: LLMChainConfig;
}

export interface SystemConfig {
    retainData?: boolean;
    applicationName?: string;
    adminEmail: string;
    llmConfig: LLMConfig;
    ingestionConfig?: {
        maxConcurrency?: number;
    };
    ragConfig: {
        vectorStoreConfig: VectorStoreConfig;
        embeddingsModels: EmbeddingModel[];
    };
    chatHistoryConfig?: {
        storeType: 'dynamodb' | 'aurora_postgres';
    };
    wafConfig?: WafConfig;
}

export interface WafConfig {
    /**
     * WAF Web ACL ARN to associate with the CloudFront distribution
     */
    readonly cloudfrontWebAclArn?: string;

    /**
     * Enable WAF for AWS API Gateway for REST API endpoints
     */
    readonly enableApiGatewayWaf?: boolean;

    /**
     * IP addresses to be allowed to access Rest API endpoint
     */
    readonly allowedExternalIpAranges?: string[];
}
