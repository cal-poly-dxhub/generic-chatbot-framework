### Table of contents

- [Generic RAG Chatbot Framework](#generic-rag-chatbot-framework)
- [Licence](#licence)
- [Key Features](#key-features)
- [Architecture overview](#architecture-overview)
    - [Solution components](#solution-components)
- [Prerequisites](#prerequisites)
    - [Build environment specifications](#build-environment-specifications)
    - [AWS account](#aws-account)
    - [Tools](#tools)
- [How to build and deploy the solution](#how-to-build-and-deploy-the-solution)
    - [Configuration](#configuration)
    - [Build and deploy](#build-and-deploy)
- [How to ingest the documents into vector store](#how-to-ingest-the-documents-into-vector-store)
- [Access the solution web UI](#access-the-solution-web-ui)
- [File structure](#file-structure)
- [Uninstall the solution](#uninstall-the-solution)

---

## Generic RAG Chatbot Framework

This is a simplified fork of the Francis GenAI RAG ChatBot framework, focused exclusively on Amazon S3 Vectors as the vector store. This framework is designed for developers who want a streamlined RAG (Retrieval-Augmented Generation) chatbot solution using AWS Bedrock and S3 Vectors.

By integrating Amazon Bedrock Knowledge Base with S3 Vectors, this architecture provides a simplified, cost-effective solution for building RAG-powered chatbots with document ingestion and retrieval capabilities.

## Licence

Licensed under the Apache License Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

    http://www.apache.org/licenses/

or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions and limitations under the License.

## Key Features

1. **Amazon S3 Vectors**: Native vector storage and similarity search capabilities within Amazon S3, providing scalable and cost-effective vector storage for document embeddings.

2. **Amazon Bedrock Knowledge Base Integration**: A managed ingestion path that leverages Amazon Bedrock's built-in capabilities for document processing and storage in Amazon S3 Vectors.

3. **AWS Bedrock Integration**:
    - Direct access to state-of-the-art foundation models through AWS Bedrock
    - Seamless integration with Bedrock Knowledge Base for enhanced RAG capabilities
    - Support for various embedding models and text generation models
    - Built-in document processing and chunking capabilities when using Bedrock Knowledge Base
    - Support for Bedrock Guardrails to filter harmful content and redact sensitive information

4. **Interactive Chatbot Interface**: User-friendly interface supporting:
    - Natural language conversations
    - Context-aware responses
    - Real-time document querying
    - Follow-up questions and clarifications

5. **Enterprise-Ready Features**:
    - Scalable architecture supporting serverless resources
    - Comprehensive security controls and encryption
    - Simplified deployment focused on S3 Vectors

---

## Architecture overview

### Solution components

The solution deploys the following components:

- **Web Application Firewall**: AWS WAF is utilized to safeguard web frontend and API endpoints from prevalent web vulnerabilities and automated bots that could potentially impact availability, compromise security, or overutilize resources.

- **Amazon CloudFront Distribution**: Amazon CloudFront distribution is used to serve the ChatBot Web UI. CloudFront delivers low latency, high performance, and secure static web hosting. An Amazon Simple Storage Service (Amazon S3) web UI bucket hosts the static web application artifacts.

- **Amazon Cognito**: An Amazon Cognito user pool to provide customers a quick and convenient authentication mechanism to explore the solution's functionalities without extensive configuration.

- **Amazon API Gateway**: It exposes a set of RESTful APIs and routes incoming requests to the backend lambda functions.

- **Chat Lambda Function**: This lambda function stores and retrieves chat messages for user's chat sessions in a DynamoDB table, enabling the maintenance of conversational context.

- **Inference Lambda Function**: The Inference Lambda Function handles user queries and provides natural language responses. It interacts with Bedrock Knowledge Base to retrieve relevant context information based on the user's query and fetches the user's chat session messages from the chat lambda function. By combining context retrieval, chat session awareness, and leveraging large language models, the Inference Lambda Function ensures accurate and contextually relevant answers to user queries.

- **Vector Store**: Amazon S3 Vectors provides native vector storage and similarity search capabilities within Amazon S3, offering scalable and cost-effective vector storage for document embeddings.

- **Document Ingestion**: Amazon Bedrock Knowledge Base provides a managed document ingestion service that:
    - Performs built-in document processing and chunking
    - Generates embeddings automatically
    - Integrates directly with S3 Vectors
    - Enables simplified management through Bedrock console

- **Chat History Data Store**: A DynamoDB table which stores the user's chat session messages.

- **Amazon Bedrock**: Provides access to:
    - Foundation Models for text generation
    - Embedding Models for vector generation
    - Knowledge Base for document ingestion and retrieval
    - Built-in RAG capabilities when using Knowledge Base

The solution architecture uses Bedrock Knowledge Base with S3 Vectors:

- Leverages managed document processing
- Stores vectors in Amazon S3 Vectors
- Offers simplified management and scalability
- Enables built-in Bedrock RAG capabilities

---

## Prerequisites

### Build environment specifications

- To build and deploy this solution, we recommend using Ubuntu with minimum 4 cores CPU, 16GB RAM. Mac(Intel) or other Linux distributions are also supported.
- The computer used to build the solution must be able to access the internet.

### AWS account

- **A CDK bootstrapped AWS account**: You must bootstrap your AWS CDK environment in the target region you want to deploy, using the AWS CDK toolkit's cdk bootstrap command. From the command line, authenticate into your AWS account, and run `cdk bootstrap aws://<YOUR ACCOUNT NUMBER>/<REGION>`. For more information, refer to the [AWS CDK's How to bootstrap](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html) page.

- **Access to Amazon Bedrock foundation models**: Access to Amazon Bedrock foundation models isn't granted by default. In order to gain access to a foundation model, an IAM user with sufficient permissions needs to request access to it through the console. Once access is provided to a model, it is available for all users in the account. To manage model access, sign into the [Amazon Bedrock console](https://console.aws.amazon.com/bedrock/). Then select Model access at the bottom of the left navigation pane.

### Tools

- The latest version of the [AWS CLI](https://aws.amazon.com/cli/), installed and configured.
- The latest version of the [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/home.html).
- [Nodejs](https://docs.npmjs.com/getting-started) version 18 or newer.
- [Docker](https://docs.docker.com/get-docker/)

---

## How to build and deploy the solution

Before you deploy the solution, review the architecture and prerequisites sections in this guide. Follow the step-by-step instructions in this section to configure and deploy the solution into your account.

Time to deploy: approximately 20 minutes

### Configuration

Use the `bin/config.yaml` file to configure the solution. You can use the existing `bin/config.yaml` as a template and customize it for your use case.

**Data retention policy configuration (optional)**

By default, all solution data (S3 buckets, DynamoDB tables, etc.) will be kept when you uninstall the solution. To remove this data, in the configuration file, set the `retainData` flag to `false`. You are liable for the service charges when solution data is retained in the default configuration.

```yaml
retainData: false,
```

**Application name (optional)**

An unique identifier, composed of ASCII characters, is used to support multiple deployments within the same account. The application name will be appended to the CloudFormation stack name, ensuring each CloudFormation stack remains unique.

```yaml
applicationName: <string>
```

**LLM configuration**

Specify settings for the large language models, including streaming, conversation history length, corpus document limits, similarity thresholds, and prompt configurations for question-answering chains.

- **streaming (optional)**: Whether to enable streaming responses from the language model. Default is false.

    ```yaml
    streaming: <true|false>
    ```

- **maxConversationHistory (optional)**: The maximum number of chat messages to include in the conversation history for rephrasing a follow-up question into a standalone question. Default is 5.

    ```yaml
    maxConversationHistory: <integer>
    ```

- **maxCorpusDocuments (optional)**: The maximum number of documents to include in the context for a question-answering prompt. Default is 5.

    ```yaml
    maxCorpusDocuments: <integer>
    ```

- **corpusSimilarityThreshold (optional)**: The minimum similarity score required for a document to be considered relevant to the question. Default is 0.25.

    ```yaml
    corpusSimilarityThreshold: <float>
    ```

- **qaChainConfig**: Configuration for the question-answering chain.
    - **modelConfig**: Configuration for the language model used in this chain.
        ```yaml
        modelConfig:
            provider: bedrock
            modelId: <the ID of the language model or inference profile (e.g., anthropic.claude-3-7-sonnet-20250219-v1:0, us.anthropic.claude-3-7-sonnet-20250219-v1:0)>
            modelKwargs: <Additional keyword arguments for the language model, such as topP, temperature etc.>
        ```
    - **promptTemplate**: The prompt template used for answering questions.
        ```yaml
        promptTemplate: <string>
        ```
    - **promptVariables**: The list of variables used in the prompt template.
        ```yaml
        promptVariables:
            - <variable1>
            - <variable2>
        ```
    - **kwargs**: Additional keyword arguments used in this chain.
        ```yaml
        kwargs:
            <key>: <value>
        ```
        To enable promotion image handling, firstly you need to upload the document to the input bucket, and then specify the promotion image URL using the `promotion_image_url` parameter in the `kwargs`.
        ```yaml
        kwargs:
            promotion_image_url: <s3>
        ```

- **rerankingConfig (optional)**: Configuration for reranking retrieved documents to improve relevance and accuracy of responses. Reranking helps refine the initial similarity search results by applying a more sophisticated model to assess document relevance.

    ```yaml
    rerankingConfig:
      modelConfig:
        provider: bedrock
        modelId: <the ID of the reranking model>
      kwargs:
        numberOfResults: <the number of top results to return after reranking>
        additionalModelRequestFields: <model-specific parameters for reranking requests>
          <key>: <value>
    ```

    When enabled, reranking is applied after the initial vector similarity search and before sending context to the LLM. This can significantly improve the quality of retrieved documents, especially for complex queries.

    > **Note**: Reranking may increase latency and costs as it involves an additional model inference step.

- **guardrailConfig (optional)**: Configuration for content moderation and PII protection. Guardrails help ensure safe and compliant interactions by filtering inappropriate content and handling sensitive information.

    ```yaml
    guardrailConfig:
        contentFilters:
            - type: <content filter type (HATE, VIOLENCE, SEXUAL)>
              inputStrength: <filter strength for input (LOW, MEDIUM, HIGH)>
              outputStrength: <filter strength for output (LOW, MEDIUM, HIGH)>
        piiFilters:
            - type: <PII filter type (EMAIL, PHONE, NAME, etc.)>
              action: <action to take on PII (ANONYMIZE, BLOCK)>
        blockedMessages:
            input: <custom message for blocked input>
            output: <custom message for blocked output>
    ```

    When enabled, guardrails are applied to both user inputs and AI responses. Content filters help prevent harmful or inappropriate content, while PII filters protect sensitive personal information.

**RAG configuration**

- **vectorStoreConfig**: Configuration for the vector store. This solution uses Amazon S3 Vectors.

    ```yaml
    vectorStoreConfig:
        vectorStoreType: s3vectors
        vectorStoreProperties:
            distanceMetric: <'euclidean' | 'cosine', default is 'cosine'>
            metadataConfiguration: # Optional
                nonFilterableMetadataKeys:
                    - <key1>
                    - <key2>
            encryptionConfiguration: # Optional
                sseType: <'AES256' | 'aws:kms'>
                kmsKey: <KMS Key ID/ARN if sseType is 'aws:kms'>
    ```

    Example:

    ```yaml
    vectorStoreConfig:
        vectorStoreType: s3vectors
        vectorStoreProperties:
            distanceMetric: cosine
            metadataConfiguration:
                nonFilterableMetadataKeys:
                    - source
                    - timestamp
    ```

- **embeddingsModels**: A list of embeddings models used for generating document embeddings.

    ```yaml
    embeddingsModels:
        - provider: bedrock
          modelId: <The ID of the embeddings model.>
          modelRefKey: <A reference key for the embeddings model.>
          dimensions: <The dimensionality of the embeddings produced by the model.>
    ```

    If multiple embedding models are configured, the first model in the list will be chosen by default unless modelRefKey is specified.

- **corpusConfig (optional)**: Configuration for the document corpus and ingestion settings. The solution uses Amazon Bedrock Knowledge Base with S3 Vectors.

    > **Important**: To use Amazon Bedrock Knowledge Base, you must configure S3 Vectors as your vector store in the `vectorStoreConfig` section.

    ```yaml
    corpusConfig:
      corpusType: knowledgebase
      corpusProperties:
        chunkingConfiguration:
          chunkingStrategy: <'FIXED_SIZE' | 'SEMANTIC', default is 'FIXED_SIZE'>
            # For FIXED_SIZE strategy
            fixedSizeChunkingConfiguration:
              maxTokens: <Maximum tokens per chunk (1-1000), default is 512>
              overlapPercentage: <Overlap between chunks (0-100), default is 20>
            # For SEMANTIC strategy
            semanticChunkingConfiguration:
              maxTokens: <Maximum tokens per chunk (1-1000)>
              overlapPercentage: <Overlap between chunks (0-100)>
              boundaryType: <'SENTENCE' | 'PARAGRAPH'>
    ```

**Chat history configuration (optional)**
By default, this solution uses DynamoDB to store chat history.

```yaml
chatHistoryConfig:
    storeType: dynamodb
```

**Handoff mechanism configuration (optional)**
This solution supports a handoff mechanism to transfer the conversation to a human agent after a certain number of requests from the user.

```yaml
handoffConfig:
    model:
        provider: bedrock
        modelId: <the Bedrock ID of the handoff model>
        supportsSystemPrompt: <true | false - whether the model supports system prompts via Converse API>
        modelKwArgs: # Optional; uses Bedrock defaults if not set
            maxTokens: 1024
            temperature: 0.1
            topP: 0.99
            stopSequences: ['...']
    handoffThreshold: <the (integer) number of requests after which the handoff mechanism is triggered>
    details: <optional list of details for the summarizer LLM to focus on>
    handoffPrompts: # Each field is individually optional and handoffPrompts is optional
        handoffRequested: <optional prompt for the model when the user requests a handoff and one has not been triggered>
        handoffJustTriggered: <optional prompt for the model when the most recent request triggered handoff>
        handoffCompleting: <optional prompt for the model when the handoff has been triggered and the user asks for a human again>
```

**AWS WAF configuration (optional)**
This solution provisions AWS WAF Web ACL for API Gateway resources, by default. For a CloudFront distribution WAF Web ACL, the solution allows users to associate their existing AWS WAF Web ACL for CloudFront with the CloudFront distribution created by the solution. Refer to the configuration options below for configuring your AWS WAF Web ACL.

```yaml
wafConfig:
    enableApiGatewayWaf: <true|false>
    cloudfrontWebAclArn: <The ARN of existing Waf WebAcl to link with CloudFront. It has to be created on us-east-1.>
    allowedExternalIpRanges: <A list of IP prefixes. e.g. 192.168.0.0/24, 10.0.0.0/8>
```

Example WAF Configuration:

```yaml
wafConfig:
    enableApiGatewayWaf: true
    allowedExternalIpRanges:
        - 192.168.0.0/24
        - 10.0.0.0/8
```

### Build and deploy

1. Open the terminal and navigate to the project root directory.
2. Configure the solution in the `bin/config.yaml` file
3. Install the dependencies: `npm install`
4. Build the code: `npm run build`
5. Deploy the solution: `npm run cdk deploy -- --parameters adminUserEmail=<ADMIN_EMAIL_ADDRESS>`

## How to ingest the documents into vector store

The solution uses Amazon Bedrock Knowledge Base for document ingestion. This section provides instructions on how to ingest documents into Amazon Bedrock Knowledge Base using the AWS CLI.

1. Find the input bucket name from deployment output starting with `InputBucket`. Upload the documents from local directory to the input bucket.

```bash
aws s3 cp <local_dir> s3://<input_bucket>/<input_prefix>/ --recursive
```

2. Find the knowledge base ID and data source ID from deployment output starting with 'KnowledgeBase'. Start the ingestion job using the AWS CLI.

```bash
aws bedrock-agent start-ingestion-job --knowledge-base-id <knowledge-base-id> --data-source-id <data-source-id>
```

Capture the ID of ingestion job.

3. Monitor the ingestion job status with the AWS CLI.

```bash
aws bedrock-agent get-ingestion-job --knowledge-base-id <knowledge-base-id> --data-source-id <data-source-id> --ingestion-job-id <job-id>
```

## Access the solution web UI

After the solution stack has been deployed and launched, you can sign in to the web interface.

1. Find the website URL from deployment output starting with `CloudFrontDomain` and open it in your browser. We recommend using Chrome. You will be redirected to the sign in page that requires username and password.
2. Sign in with the email address specified during deployment (`adminEmail`) and use the temporary password received via email after deployment. You will receive a temporary password from `no-reply@verificationemail.com`.
3. During the sign in, you are required to set a new password when signing in for the first time.
4. After signing in, you can view the solution's web UI.

---

## File structure

Upon successfully cloning the repository into your local development environment but prior to running the initialization script, you will see the following file structure in your editor.

```
|- lib/                       # Infrastructure and backend code
   |- infra/                  # CDK Infrastructure
   |- backend/                # Backend code
|- frontend/                  # React ChatBot UI application
   |- src/                    # Source code files
   |- public/                 # Static assets
|- bin/                       # Configuration and deployment entry point
   |- config.yaml             # Configuration file
   |- infra.ts                # CDK app entry point
|- .gitignore                 # Git ignore file
|- LICENSE.txt                # Apache 2.0 license
|- README.md                  # Project documentation
```

---

## Uninstall the solution

You can uninstall the solution by directly deleting the stacks from the AWS CloudFormation console.

To uninstall the solution, delete the stacks from the AWSCloudFormation console

- Go to the AWS CloudFormation console, find and delete the following stacks:
    - All the stacks with the prefix `FrancisChatbotStack`

Alternatively, you could also uninstall the solution by running `npm run cdk destroy` from the project root directory.

---

Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

    http://www.apache.org/licenses/

or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions and limitations under the License.
