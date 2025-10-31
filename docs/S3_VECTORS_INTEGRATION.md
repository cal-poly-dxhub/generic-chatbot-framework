# S3 Vectors Integration

This document describes the integration of Amazon S3 Vectors into the Francis RAG chatbot framework.

## Overview

Amazon S3 Vectors is a new AWS service that provides native vector storage and similarity search capabilities within Amazon S3. This integration uses the `cdk-s3-vectors` library (https://github.com/bimnett/cdk-s3-vectors) to provision S3 Vectors infrastructure as part of the Francis chatbot stack.

## Architecture

The S3 Vectors integration includes:

1. **Vector Bucket**: An S3 vector bucket for storing vector embeddings
2. **Vector Index**: An index within the bucket for similarity search
3. **Knowledge Base** (optional): An Amazon Bedrock knowledge base using S3 Vectors as the vector store
4. **Data Source** (optional): S3 data source for the knowledge base

## Configuration

To use S3 Vectors, configure your `config.yaml` with the following:

```yaml
ragConfig:
  vectorStoreConfig:
    vectorStoreType: s3vectors
    vectorStoreProperties:
      distanceMetric: cosine  # 'euclidean' or 'cosine' (default: 'cosine')
      # Optional: Configure non-filterable metadata keys
      metadataConfiguration:
        nonFilterableMetadataKeys:
          - source
          - timestamp
          - category
      # Optional: Configure encryption
      encryptionConfiguration:
        sseType: AES256  # 'AES256' or 'aws:kms'
        # kmsKey: <KMS Key ID>  # Required if sseType is 'aws:kms'
  embeddingsModels:
    - provider: bedrock
      modelId: amazon.titan-embed-text-v2:0
      modelRefKey: titan-embed-text-v2
      dimensions: 1024
  corpusConfig:
    corpusType: knowledgebase  # Use 'knowledgebase' for S3 Vectors
```

## Components

### Vector Store

The `S3VectorStore` construct (`lib/infra/vectorstore/index.ts`) creates:
- A vector bucket with configurable encryption
- A vector index with configurable dimensions and distance metric
- A knowledge base (if `corpusType: knowledgebase` is configured)
- A data source (if a document bucket is provided)

### Permissions

The construct provides helper methods to grant permissions to Lambda functions:
- `grantVectorRead()`: Grants read permissions for querying vectors
- `grantVectorWrite()`: Grants write permissions for adding/deleting vectors
- `grantKnowledgeBaseQuery()`: Grants permissions for querying the knowledge base

## Usage

### With Knowledge Base (Recommended)

When using `corpusType: knowledgebase`, the knowledge base automatically:
- Processes documents from the S3 document bucket
- Generates embeddings using the configured embedding model
- Stores vectors in S3 Vectors
- Provides retrieval capabilities for the chatbot

### With Custom Ingestion

For custom ingestion workflows:
1. Use the `grantVectorWrite()` method to grant write access to your ingestion Lambda
2. Use the S3 Vectors SDK to add vectors to the index
3. Use the `grantVectorRead()` method to grant read access to your inference Lambda

## Benefits

1. **Cost-effective**: Pay only for what you use with S3 pricing
2. **Scalable**: Handle large-scale vector datasets
3. **Simple**: Native S3 integration without managing separate infrastructure
4. **Secure**: Built-in encryption and access control

## Migration from OpenSearch/PGVector

To migrate from existing vector stores:

1. Update your `config.yaml` to use `vectorStoreType: s3vectors`
2. Retrain/re-index your vectors into S3 Vectors
3. Update any custom ingestion or retrieval logic to use S3 Vectors APIs

## References

- [Amazon S3 Vectors User Guide](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vectors.html)
- [cdk-s3-vectors Library](https://github.com/bimnett/cdk-s3-vectors)
- [cdk-s3-vectors API Documentation](https://github.com/bimnett/cdk-s3-vectors/blob/main/API.md)

