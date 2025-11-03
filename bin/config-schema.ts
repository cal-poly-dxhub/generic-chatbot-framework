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
                guardrailConfig: {
                    type: 'object',
                    description: 'Configuration for content safety guardrails',
                    properties: {
                        contentFilters: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    type: {
                                        type: 'string',
                                        description: 'Type of content filter',
                                    },
                                    inputStrength: {
                                        type: 'string',
                                        description:
                                            'Strength of input content filtering',
                                    },
                                    outputStrength: {
                                        type: 'string',
                                        description:
                                            'Strength of output content filtering',
                                    },
                                },
                                required: ['type', 'inputStrength', 'outputStrength'],
                            },
                        },
                        piiFilters: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    type: {
                                        type: 'string',
                                        description: 'Type of PII filter',
                                    },
                                    action: {
                                        type: 'string',
                                        description: 'Action to take on detected PII',
                                    },
                                },
                                required: ['type', 'action'],
                            },
                        },
                        blockedMessages: {
                            type: 'object',
                            properties: {
                                input: {
                                    type: 'string',
                                    description: 'Message to show when input is blocked',
                                },
                                output: {
                                    type: 'string',
                                    description: 'Message to show when output is blocked',
                                },
                            },
                            required: ['input', 'output'],
                        },
                    },
                    required: ['contentFilters', 'blockedMessages'],
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
                            enum: ['s3vectors'],
                        },
                        vectorStoreProperties: {
                            description: 'Properties of the S3 Vectors store',
                            type: 'object',
                            properties: {
                                distanceMetric: {
                                    description:
                                        "Distance metric used for similarity search ('euclidean' | 'cosine')",
                                    type: 'string',
                                    enum: ['euclidean', 'cosine'],
                                },
                                metadataConfiguration: {
                                    description:
                                        'Metadata configuration for non-filterable keys',
                                    type: 'object',
                                    properties: {
                                        nonFilterableMetadataKeys: {
                                            type: 'array',
                                            items: { type: 'string' },
                                        },
                                    },
                                },
                                encryptionConfiguration: {
                                    description: 'Server-side encryption configuration',
                                    type: 'object',
                                    properties: {
                                        sseType: {
                                            type: 'string',
                                            enum: ['AES256', 'aws:kms'],
                                            description: 'Server-side encryption type',
                                        },
                                        kmsKey: {
                                            type: 'string',
                                            description:
                                                'KMS Key ID/ARN if sseType is aws:kms',
                                        },
                                    },
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
                            enum: ['knowledgebase'],
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
                    enum: ['dynamodb'],
                    default: 'dynamodb',
                    description: 'Type of storage for chat history',
                },
            },
        },
        handoffConfig: {
            type: 'object',
            description: 'Configuration for handing off conversations to a human agent',
            required: ['modelConfig', 'handoffThreshold'],
            properties: {
                modelConfig: {
                    type: 'object',
                    description: 'Configuration for the handoff summarizer LLM model',
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
                        supportsSystemPrompt: {
                            type: 'boolean',
                            description:
                                'Whether the LLM model supports system prompts via the Converse API',
                            default: false,
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
                    },
                },
                handoffThreshold: {
                    type: 'number',
                    description:
                        'Number of times the user requests a human before handoff',
                    default: 1,
                },
                handoffPrompts: {
                    type: 'object',
                    description:
                        'Responses the handoff summarizer provides to the user when they ask for a handoff.',
                    properties: {
                        handoffRequested: {
                            type: 'string',
                            description:
                                'Response to send to the user when they ask for a handoff but the threshold has not been reached',
                            default:
                                "The user has requested to speak to a human. As if you're talking to the user, please explain that you're sorry you couldn't help. Ask, 'Can we try again? Please tell me about your issue.' Don't acknowledge that you're speaking to the human; just speak to them. Do not include any tone markers. Just speak to the person naturally.",
                        },
                        handoffJustTriggered: {
                            type: 'string',
                            description:
                                'Response to send to the user once a handoff is triggered',
                            default:
                                "The user has requested to speak to a human. As if you're talking to the user, state that you are connecting them to a representative. Also state, 'In the meantime, you can keep talking to me. I'm here to help.' Don't acknowledge that you're speaking to the human; just speak to them. Do not include any tone markers. Just speak to the person naturally.",
                        },
                        handoffCompleting: {
                            type: 'string',
                            description:
                                'Response to send to the user when they ask for a handoff but a handoff was already triggered',
                            default:
                                "The user has requested to speak to a human. As if you're talking to the user, state that you have already contacted someone who can help. Also state that they can keep talking to you in the meantime if they want. Don't acknowledge that you're speaking to the human. Do not include any tone markers. Just speak to the person naturally.",
                        },
                    },
                    default: {
                        handoffRequested:
                            "The user has requested to speak to a human. As if you're talking to the user, please explain that you're sorry you couldn't help. Ask, 'Can we try again? Please tell me about your issue.' Don't acknowledge that you're speaking to the human; just speak to them. Do not include any tone markers. Just speak to the person naturally.",
                        handoffJustTriggered:
                            "The user has requested to speak to a human. As if you're talking to the user, state that you are connecting them to a representative. Also state, 'In the meantime, you can keep talking to me. I'm here to help.' Don't acknowledge that you're speaking to the human; just speak to them. Do not include any tone markers. Just speak to the person naturally.",
                        handoffCompleting:
                            "The user has requested to speak to a human. As if you're talking to the user, state that you are connecting them to a representative. Also state, 'In the meantime, you can keep talking to me. I'm here to help.' Don't acknowledge that you're speaking to the human; just speak to them. Do not include any tone markers. Just speak to the person naturally.",
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
                supportsSystemPrompt: {
                    type: 'boolean',
                    description:
                        'Whether the LLM model supports system prompts via the Converse API',
                    default: false,
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
                    default: [],
                    items: {
                        type: 'string',
                    },
                },
            },
        },
    },
};

export default configSchema;
