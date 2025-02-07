/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
*/
/* eslint-disable @typescript-eslint/naming-convention */
const configSchema = {
    description: 'Configuration for the Retrieval Augmented Chatbot system',
    type: 'object',
    properties: {
        retainData: {
            description: 'Flag to indicate whether to retain data or not',
            type: 'boolean',
            default: false,
        },
        applicationName: {
            description: 'Name of the application',
            pattern: '^[a-zA-Z0-9-]+$',
            maxLength: 20,
            minLength: 3,
            type: 'string',
        },
        llmConfig: {
            type: 'object',
            properties: {
                streaming: {
                    type: 'boolean',
                    description: 'Whether to enable streaming for the LLM response',
                },
                rerankingConfig: {
                    type: 'object',
                    description: 'Configuration for document reranking',
                    properties: {
                        modelConfig: {
                            type: 'object',
                            description: 'Configuration for reranking model',
                            properties: {
                                provider: {
                                    type: 'string',
                                    enum: ['bedrock'],
                                    description: 'Provider of the reranking model',
                                },
                                modelId: {
                                    type: 'string',
                                    description: 'ID of the reranking model',
                                },
                            },
                            required: ['provider', 'modelId'],
                        },
                        kwargs: {
                            type: 'object',
                            description:
                                'Additional configuration parameters for reranking',
                            properties: {
                                numberOfResults: {
                                    type: 'number',
                                    description:
                                        'Number of results to return from reranking',
                                },
                                additionalModelRequestFields: {
                                    type: 'object',
                                    description:
                                        'Model-specific configuration parameters',
                                },
                            },
                        },
                    },
                    required: ['modelConfig'],
                },
                maxConversationHistory: {
                    type: 'number',
                    description:
                        'Maximum number of messages to include in the conversation history',
                },
                maxCorpusDocuments: {
                    type: 'number',
                    description: 'Maximum number of documents to include in the corpus',
                },
                corpusSimilarityThreshold: {
                    type: 'number',
                    description:
                        'Threshold for similarity score to include a document in the corpus',
                },
                qaChainConfig: {
                    $ref: '#/definitions/LLMChainConfig',
                    description: 'Configuration for the question-answering chain',
                },
                standaloneChainConfig: {
                    $ref: '#/definitions/LLMChainConfig',
                    description: 'Configuration for the standalone chain (optional)',
                },
                classificationChainConfig: {
                    $ref: '#/definitions/LLMChainConfig',
                    description: 'Configuration for the classification chain (optional)',
                },
            },
            required: ['qaChainConfig'],
        },
        ragConfig: {
            description: 'Configuration for the Retrieval Augmented Generator (RAG)',
            type: 'object',
            properties: {
                vectorStoreConfig: {
                    description: 'Configuration for the vector store',
                    type: 'object',
                    properties: {
                        vectorStoreType: {
                            description: 'Type of vector store',
                            type: 'string',
                            enum: ['pgvector', 'opensearch'],
                        },
                        vectorStoreProperties: {
                            description: 'Properties of the vector store',
                            type: 'object',
                            properties: {
                                minCapacity: {
                                    description:
                                        'The minimum capacity (in Aurora Capacity Units) for the vector store.',
                                    type: 'integer',
                                },
                                maxCapacity: {
                                    description:
                                        'The maximum capacity (in Aurora Capacity Units) for the vector store.',
                                    type: 'integer',
                                },
                                useRDSProxy: {
                                    description:
                                        'Whether to use an RDS Proxy for the vector store connection.',
                                    type: 'boolean',
                                },
                            },
                        },
                    },
                    required: ['vectorStoreType'],
                },
                corpusConfig: {
                    description: 'Configuration for the document corpus and ingestion',
                    type: 'object',
                    properties: {
                        corpusProperties: {
                            description: 'Properties for corpus configuration',
                            type: 'object',
                        },
                        corpusType: {
                            description: 'Type of corpus',
                            type: 'string',
                            enum: ['default', 'knowledgebase'],
                        },
                    },
                },
                embeddingsModels: {
                    description: 'List of embeddings models',
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            provider: {
                                description: 'Provider of the embeddings model',
                                type: 'string',
                                enum: ['bedrock', 'sagemaker'],
                            },
                            modelId: {
                                description: 'ID of the embeddings model',
                                type: 'string',
                            },
                            modelEndpointName: {
                                type: 'string',
                                description:
                                    'Name of the SageMaker endpoint for the embeddings model',
                            },
                            modelRefKey: {
                                description: 'Reference key for the embeddings model',
                                type: 'string',
                            },
                            dimensions: {
                                description: 'Dimensions of the embeddings model',
                                type: 'integer',
                            },
                        },
                        required: ['provider', 'modelId', 'modelRefKey', 'dimensions'],
                    },
                },
            },
            required: ['vectorStoreConfig', 'embeddingsModels'],
        },
        chatHistoryConfig: {
            type: 'object',
            description: 'Configuration for chat history storage',
            properties: {
                storageType: {
                    type: 'string',
                    enum: ['dynamodb', 'aurora_postgres'],
                    default: 'dynamodb',
                    description: 'Type of storage for chat history',
                },
            },
        },
        handoffConfig: {
            type: 'object',
            description: 'Configuration for handing off conversations to a human agent',
            required: ['provider', 'modelId'],
            properties: {
                provider: {
                    type: 'string',
                    const: 'bedrock',
                },
                modelId: {
                    type: 'string',
                    description:
                        'Bedrock ID of the LLM to use for summarizing a conversation',
                },
                modelKwArgs: {
                    $ref: '#/definitions/ModelKwargs',
                    default: {
                        maxTokens: 1024,
                        temperature: 0.1,
                        topP: 0.95,
                        stopSequences: [],
                    },
                },
                details: {
                    type: 'array',
                    description:
                        'Details for the handoff summarizer LLM to focus on (e.g., "Questions the user asked")',
                    default: [
                        'The main issue the user is trying to solve',
                        'Questions the user asked',
                        'Places where the user got stuck',
                        'Instances where the user asked for help',
                        'Instances where the user asked for a human',
                        'Whether the user reported the issue as resolved',
                    ],
                },
            },
        },
        wafConfig: {
            type: 'object',
            description: 'Configuration for AWS WAF (Web Application Firewall)',
            properties: {
                cloudfrontWebAclArn: {
                    type: 'string',
                    description: 'ARN of the CloudFront Web ACL',
                },
                enableApiGatewayWaf: {
                    type: 'boolean',
                    description: 'Flag to enable or disable AWS WAF for API Gateway',
                },
                allowedExternalIpRanges: {
                    type: 'string',
                    description:
                        'IP addresses or CIDR ranges to be allowed to access API endpoints',
                },
            },
            required: ['enableApiGatewayWaf'],
        },
    },
    required: ['ragConfig', 'llmConfig'],
    definitions: {
        LLMChainConfig: {
            type: 'object',
            title: 'LLMChainConfig',
            description: 'Configuration for an LLM chain',
            required: ['modelConfig', 'promptTemplate'],
            properties: {
                modelConfig: {
                    $ref: '#/definitions/LLMModel',
                },
                promptTemplate: {
                    type: 'string',
                    description: 'Template for the prompt to send to the LLM model',
                },
                promptVariables: {
                    type: 'array',
                    description: 'Variables to be replaced in the prompt template',
                    items: {
                        type: 'string',
                    },
                },
                kwargs: {
                    type: 'object',
                    description: 'Additional keyword arguments for the LLM chain',
                },
            },
        },
        LLMModel: {
            oneOf: [
                {
                    $ref: '#/definitions/SageMakerLLMModel',
                },
                {
                    $ref: '#/definitions/BedRockLLMModel',
                },
            ],
        },
        SageMakerLLMModel: {
            type: 'object',
            title: 'SageMakerLLMModel',
            description: 'Configuration for a SageMaker LLM model',
            required: ['provider', 'modelId', 'modelEndpointName'],
            properties: {
                provider: {
                    type: 'string',
                    const: 'sagemaker',
                },
                modelId: {
                    type: 'string',
                    description: 'ID of the LLM model',
                },
                modelEndpointName: {
                    type: 'string',
                    description: 'Name of the SageMaker endpoint for the LLM model',
                },
                modelKwargs: {
                    $ref: '#/definitions/ModelKwargs',
                },
                region: {
                    type: 'string',
                    description: 'AWS region for the LLM model',
                },
            },
        },
        BedRockLLMModel: {
            type: 'object',
            title: 'BedRockLLMModel',
            description: 'Configuration for a BedRock LLM model',
            required: ['provider', 'modelId'],
            properties: {
                provider: {
                    type: 'string',
                    const: 'bedrock',
                },
                modelId: {
                    type: 'string',
                    description: 'ID of the LLM model',
                },
                modelKwArgs: {
                    $ref: '#/definitions/ModelKwargs',
                },
            },
        },
        ModelKwargs: {
            type: 'object',
            title: 'ModelKwargs',
            description: 'Additional keyword arguments for the LLM model',
            properties: {
                maxTokens: {
                    type: 'number',
                    description: 'Maximum number of tokens for the LLM model output',
                },
                temperature: {
                    type: 'number',
                    description:
                        'Temperature for the LLM model output (higher values increase randomness)',
                },
                topP: {
                    type: 'number',
                    description:
                        'Top-p value for the LLM model output (nucleus sampling)',
                },
                stopSequences: {
                    type: 'array',
                    description: 'Stop sequences for the LLM model output',
                    items: {
                        type: 'string',
                    },
                },
            },
        },
    },
};

export default configSchema;
