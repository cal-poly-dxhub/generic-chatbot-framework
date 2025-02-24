/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
*/
/* eslint-disable @typescript-eslint/naming-convention */

import { CfnDataSource } from 'aws-cdk-lib/aws-bedrock';

export interface SolutionInfo {
    readonly solutionName: string;
    readonly solutionVersion: string;
}

export type VectorStoreType = 'pgvector' | 'opensearch';

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

export interface OpenSearchVectorStoreConfig {
    readonly vectorStoreType: 'opensearch';
    readonly vectorStoreProperties?: {
        readonly standbyReplicas: 'ENABLED' | 'DISABLED';
        readonly allowFromPublic: boolean;
    };
}

export type VectorStoreConfig = PgVectorStoreConfig | OpenSearchVectorStoreConfig;

export type CorpusType = 'knowledgebase' | 'default';

export interface BaseCorpusConfig {
    readonly corpusType: CorpusType;
}

export interface KnowledgeBaseCorpusConfig extends BaseCorpusConfig {
    readonly corpusType: 'knowledgebase';
    readonly corpusProperties?: {
        chunkingConfiguration?: CfnDataSource.ChunkingConfigurationProperty;
    };
}

export interface DefaultCorpusConfig extends BaseCorpusConfig {
    readonly corpusType: 'default';
    readonly corpusProperties?: {
        chunkingConfiguration?: {
            chunkSize?: number;
            chunkOverlap?: number;
        };
    };
}

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
    // NOTE: for review: this allows passing system prompts via Converse API when available
    readonly supportsSystemPrompt: boolean;
}

export interface SageMakerLLMModel extends LLMModelBase {
    readonly provider: 'sagemaker';
    readonly modelEndpointName: string;
}

export type RerankingModelBase = ModelBase;

export interface BedRockRerankingModel extends RerankingModelBase {
    readonly provider: 'bedrock';
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

export type RerankingModel = BedRockRerankingModel;

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
    guardrailConfig?: GuardrailConfig;
    qaChainConfig: LLMChainConfig;
    rerankingConfig?: RerankingConfig;
    standaloneChainConfig?: LLMChainConfig;
    classificationChainConfig?: LLMChainConfig;
}

export interface RerankingConfig {
    modelConfig: RerankingModel;
    kwargs?: {
        numberOfResults?: number;
        additionalModelRequestFields?: Record<string, unknown>;
    };
}

export interface HandoffPrompts {
    handoffRequested: string;
    handoffJustTriggered: string;
    handoffCompleting: string;
}

export interface HandoffConfig {
    details?: string[];
    modelConfig: BedRockLLMModel;
    handoffThreshold: number;
    handoffPrompts: HandoffPrompts;
}

export interface GuardrailPiiConfig {
    type: string;
    action: string;
}

export interface GuardrailFilterConfig {
    type: string;
    inputStrength: string;
    outputStrength: string;
}

export interface GuardrailConfig {
    contentFilters: GuardrailFilterConfig[];
    piiFilters?: GuardrailPiiConfig[];
    blockedMessages: {
        input: string;
        output: string;
    };
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
        corpusConfig?: KnowledgeBaseCorpusConfig | DefaultCorpusConfig;
    };
    chatHistoryConfig?: {
        storeType: 'dynamodb' | 'aurora_postgres';
    };
    handoffConfig?: HandoffConfig;
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
