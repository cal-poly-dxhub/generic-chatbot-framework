# Retrieval Augmented Chatbot

> A production-ready RAG (Retrieval-Augmented Generation) chatbot framework powered by AWS Bedrock and S3 Vectors

## Index

- Overview
- Features
- Quickstart
- Usage
- Configuration
- Architecture
- Deployment
- Troubleshooting
- Roadmap
- License
- Credits

## Overview

A complete RAG (Retrieval-Augmented Generation) chatbot solution for developers so they can build production-ready conversational AI applications with document ingestion, vector storage, and context-aware responses using AWS Bedrock and Amazon S3 Vectors.

This is a simplified fork of the Francis GenAI RAG ChatBot framework, focused exclusively on Amazon S3 Vectors as the vector store. By integrating Amazon Bedrock Knowledge Base with S3 Vectors, this architecture provides a simplified, cost-effective solution for building RAG-powered chatbots with document ingestion and retrieval capabilities.

## Features

- **RAG (Retrieval-Augmented Generation)**: Core RAG pipeline that retrieves relevant context from documents and generates accurate, context-aware responses using large language models

- **Amazon S3 Vectors**: Native vector storage and similarity search capabilities within Amazon S3, providing scalable and cost-effective vector storage for document embeddings

- **Amazon Bedrock Knowledge Base Integration**: A managed ingestion path that leverages Amazon Bedrock's built-in capabilities for document processing and storage in Amazon S3 Vectors

- **AWS Bedrock Integration**:

  - Direct access to state-of-the-art foundation models through AWS Bedrock
  - Seamless integration with Bedrock Knowledge Base for enhanced RAG capabilities
  - Support for various embedding models and text generation models
  - Built-in document processing and chunking capabilities when using Bedrock Knowledge Base
  - Support for Bedrock Guardrails to filter harmful content and redact sensitive information

- **Interactive Chatbot Interface**: User-friendly interface supporting:

  - Natural language conversations
  - Context-aware responses powered by RAG
  - Real-time document querying
  - Follow-up questions and clarifications

- **Enterprise-Ready Features**:
  - Scalable architecture supporting serverless resources
  - Comprehensive security controls and encryption
  - Simplified deployment focused on S3 Vectors
  - AWS WAF integration for API protection

## Quickstart

```bash
# Install infrastructure dependencies
cd infra
npm install

# Build the solution
npm run build

# Deploy (requires AWS credentials configured)
npm run cdk deploy -- --parameters adminUserEmail=<YOUR_EMAIL>
```

**Prerequisites:**

- AWS account with CDK bootstrapped in target region
- Node.js 18+ installed
- Docker installed
- AWS CLI installed and configured
- Access to Amazon Bedrock foundation models (request via Bedrock console)

## Usage

### 1. Ingest Documents for RAG

The solution uses Amazon Bedrock Knowledge Base for document ingestion into the RAG vector store:

1. Find the input bucket name from deployment output (starts with `InputBucket`). Upload documents to the input bucket:

```bash
aws s3 cp <local_dir> s3://<input_bucket>/<input_prefix>/ --recursive
```

2. Find the knowledge base ID and data source ID from deployment output (starts with `KnowledgeBase`). Start the ingestion job:

```bash
aws bedrock-agent start-ingestion-job --knowledge-base-id <knowledge-base-id> --data-source-id <data-source-id>
```

3. Monitor the ingestion job status:

```bash
aws bedrock-agent get-ingestion-job --knowledge-base-id <knowledge-base-id> --data-source-id <data-source-id> --ingestion-job-id <job-id>
```

### 2. Access the Web UI

1. Find the website URL from deployment output (starts with `CloudFrontDomain`) and open it in your browser
2. Sign in with the email address specified during deployment (`adminEmail`) and use the temporary password received via email
3. Set a new password when signing in for the first time
4. Start chatting - the RAG system will retrieve relevant context from your documents and generate responses

### 3. RAG Workflow

The chatbot follows a standard RAG workflow:

- **Document Ingestion**: Documents are uploaded to S3 and processed by Bedrock Knowledge Base
- **Vector Storage**: Document chunks are embedded and stored in S3 Vectors
- **Retrieval**: User queries trigger similarity search to find relevant document chunks
- **Generation**: Retrieved context is combined with the query and sent to the LLM for response generation

## Configuration

Create and customize `infra/bin/config.yaml` to configure the solution:

### LLM Configuration

```yaml
systemConfig:
  llmConfig:
    streaming: false # Enable streaming responses
    maxConversationHistory: 5 # Max chat messages for context
    maxCorpusDocuments: 5 # Max documents in RAG context
    corpusSimilarityThreshold: 0.25 # Minimum similarity score
    qaChainConfig:
      modelConfig:
        modelId: us.anthropic.claude-3-7-sonnet-20250219-v1:0
        modelKwargs:
          temperature: 0.7
          topP: 0.9
      promptTemplate: |
        You are a helpful assistant.
        Context: ${context}
        Question: ${question}
      promptVariables:
        - context
        - question
```

### RAG Configuration (Core)

```yaml
systemConfig:
  ragConfig:
    # Vector store configuration
    vectorStoreConfig:
      vectorStoreProperties:
        distanceMetric: cosine # 'cosine' or 'euclidean'
        metadataConfiguration:
          nonFilterableMetadataKeys:
            - source
            - timestamp

    # Embedding model for RAG
    embeddingModel:
      modelId: amazon.titan-embed-text-v2:0
      modelRefKey: titan-embed-text-v2
      dimensions: 1024

    # Corpus/document ingestion configuration
    corpusConfig:
      corpusProperties:
        chunkingConfiguration:
          chunkingStrategy: FIXED_SIZE # or 'SEMANTIC'
          fixedSizeChunkingConfiguration:
            maxTokens: 512
            overlapPercentage: 20
```

### Advanced RAG Features

**Reranking** (optional): Improve document relevance before generation:

```yaml
rerankingConfig:
  modelConfig:
    modelId: <reranking-model-id>
  kwargs:
    numberOfResults: 5
```

**Guardrails** (optional): Content moderation and PII protection:

```yaml
guardrailConfig:
  contentFilters:
    - type: HATE
      inputStrength: MEDIUM
      outputStrength: MEDIUM
  piiFilters:
    - type: EMAIL
      action: ANONYMIZE
```

### Other Configuration

**Chat History** (optional):

```yaml
chatHistoryConfig: {}
```

**Handoff Mechanism** (optional):

```yaml
handoffConfig:
  modelConfig:
    modelId: <bedrock-model-id>
    supportsSystemPrompt: true
  handoffThreshold: 5
```

**AWS WAF** (optional):

```yaml
wafConfig:
  enableApiGatewayWaf: true
  allowedExternalIpRanges:
    - 192.168.0.0/24
```

**Data Retention** (optional):

```yaml
systemConfig:
  retainData: false # Set to false to delete data on uninstall
```

## Architecture

- **Frontend**: React/TypeScript web application served via CloudFront and S3, with Cloudscape Design components

- **Backend**: Python Lambda functions for:

  - **Inference Lambda**: Handles RAG queries, retrieves context from S3 Vectors via Bedrock Knowledge Base, and generates responses using Bedrock LLMs
  - **Chat Lambda**: Manages conversation history in DynamoDB

- **RAG Pipeline**:

  - **Document Ingestion**: Bedrock Knowledge Base processes documents from S3 input bucket
  - **Vector Storage**: Amazon S3 Vectors stores document embeddings
  - **Retrieval**: Bedrock Knowledge Base performs similarity search on S3 Vectors
  - **Generation**: Bedrock LLM generates responses using retrieved context

- **Data**:

  - Amazon S3 Vectors for vector storage
  - DynamoDB for chat history
  - S3 buckets for document input and web UI hosting

- **Infrastructure**: AWS CDK (TypeScript) for infrastructure as code

- **Security**:

  - Amazon Cognito for authentication
  - AWS WAF for API protection
  - API Gateway for RESTful APIs

- **Additional Components**:
  - Amazon CloudFront for content delivery
  - WebSocket support for real-time communication

## Deployment

### Prerequisites

1. **AWS Account**: CDK bootstrapped in target region

   ```bash
   cdk bootstrap aws://<YOUR_ACCOUNT_NUMBER>/<REGION>
   ```

2. **Amazon Bedrock Access**: Request model access via [Bedrock console](https://console.aws.amazon.com/bedrock/)

3. **Tools Required**:
   - AWS CLI (latest version)
   - AWS CDK (latest version)
   - Node.js 18+
   - Docker

### Build Environment

Recommended: Ubuntu with minimum 4 cores CPU, 16GB RAM. Mac (Intel) or other Linux distributions also supported. The build machine must have internet access.

### Deployment Steps

1. Configure the solution in `infra/bin/config.yaml`

2. Navigate to infrastructure directory:

   ```bash
   cd infra
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Build the solution:

   ```bash
   npm run build
   ```

5. Deploy:

   ```bash
   npm run cdk deploy -- --parameters adminUserEmail=<ADMIN_EMAIL_ADDRESS>
   ```

   Deployment time: approximately 20 minutes

6. After deployment, note the output values:
   - `CloudFrontDomain`: Web UI URL
   - `InputBucket`: S3 bucket for document uploads
   - `KnowledgeBase`: Knowledge base ID and data source ID

### Uninstall

To uninstall the solution:

**Option 1**: Delete stacks from AWS CloudFormation console

- Go to AWS CloudFormation console
- Find and delete all stacks with prefix `FrancisChatbotStack`

**Option 2**: Use CDK destroy

```bash
cd infra
npm run cdk destroy
```

**Note**: By default, solution data (S3 buckets, DynamoDB tables, etc.) will be retained when uninstalling. Set `retainData: false` in `config.yaml` to remove data on uninstall. You are liable for service charges when data is retained.

## Troubleshooting

- **Bedrock model access denied** → Request model access through the [Amazon Bedrock console](https://console.aws.amazon.com/bedrock/). Go to Model access and request access to the models you need.

- **CDK bootstrap error** → Ensure your AWS account is bootstrapped in the target region: `cdk bootstrap aws://<ACCOUNT>/<REGION>`

- **Deployment fails with permissions error** → Verify AWS credentials are configured correctly and have sufficient permissions for CDK deployment

- **Ingestion job stuck or failed** → Check ingestion job status with AWS CLI: `aws bedrock-agent get-ingestion-job --knowledge-base-id <id> --data-source-id <id> --ingestion-job-id <job-id>`. Review CloudWatch logs for detailed error messages.

- **RAG retrieval returns no results** → Verify documents were successfully ingested, check `corpusSimilarityThreshold` in config (may be too high), and ensure embeddings model is configured correctly

- **Can't access web UI** → Check CloudFront distribution status, verify Cognito user pool is active, and confirm you're using the correct email and password

- **WebSocket connection issues** → Verify WebSocket API is deployed and check authorizer Lambda permissions

## Roadmap

- [ ] CloudFormation support for S3 vectors
- [ ] Enhanced reranking capabilities
- [ ] Multi-language support
- [ ] Advanced analytics and monitoring

## License

Apache-2.0

Licensed under the Apache License Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

    http://www.apache.org/licenses/

or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions and limitations under the License.

## Credits

- Amazon.com, Inc. or its affiliates
- Based on the Francis GenAI RAG Chatbot framework

---

Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
