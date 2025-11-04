/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
*/
/* eslint-disable @typescript-eslint/naming-convention */

import { CfnDataSource } from 'aws-cdk-lib/aws-bedrock';
import { IKey } from 'aws-cdk-lib/aws-kms';

export interface SolutionInfo {
    readonly solutionName: string;
    readonly solutionVersion: string;
}

export interface S3VectorStoreConfig {
    readonly vectorStoreProperties?: {
        readonly distanceMetric?: 'euclidean' | 'cosine';
        readonly metadataConfiguration?: {
            readonly nonFilterableMetadataKeys: string[];
        };
        readonly encryptionConfiguration?: {
            readonly sseType: 'AES256' | 'aws:kms';
            readonly kmsKey?: IKey;
        };
    };
}

export type VectorStoreConfig = S3VectorStoreConfig;

export interface KnowledgeBaseCorpusConfig {
    readonly corpusProperties?: {
        chunkingConfiguration?: CfnDataSource.ChunkingConfigurationProperty;
    };
}

export interface LLMModelBase {
    readonly modelId: string;
    readonly region?: string;
    readonly modelKwargs?: ModelKwargs;
}

export interface BedRockLLMModel extends LLMModelBase {
    // NOTE: for review: this allows passing system prompts via Converse API when available
    readonly supportsSystemPrompt: boolean;
}

export interface BedRockRerankingModel {
    readonly modelId: string;
    readonly region?: string;
}

export interface BedRockEmbeddingModel {
    readonly modelId: string;
    readonly region?: string;
    readonly dimensions: number;
    readonly modelRefKey: string;
}

export type EmbeddingModel = BedRockEmbeddingModel;

export type LLMModel = BedRockLLMModel;

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
        embeddingModel: EmbeddingModel;
        corpusConfig?: KnowledgeBaseCorpusConfig;
    };
    chatHistoryConfig?: Record<string, never>;
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
