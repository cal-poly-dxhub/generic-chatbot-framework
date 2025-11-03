#!/bin/bash
# Script to test that the v2 deployment works correctly

set -e

REGION="us-east-1"
STACK_NAME="FrancisChatbotStack-minimal"
APPLICATION_NAME="minimal"

echo "=== Testing V2 Deployment ==="
echo ""

echo "1. Checking CloudFormation stack status..."
aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].StackStatus" \
    --output text

echo ""
echo "2. Checking if new V2 index exists..."
aws s3vectors get-index \
    --vector-bucket-name "fr-vectors-${APPLICATION_NAME}" \
    --index-name "fr-index-${APPLICATION_NAME}-v2" \
    --region "$REGION" 2>&1 | grep -E "(indexName|dimension|distanceMetric|nonFilterableMetadataKeys)" || echo "   Index not found or error"

echo ""
echo "3. Listing all indexes in bucket..."
aws s3vectors list-indexes \
    --vector-bucket-name "fr-vectors-${APPLICATION_NAME}" \
    --region "$REGION" \
    --query "indexes[].indexName" \
    --output table

echo ""
echo "4. Checking if new V2 knowledge base exists..."
aws bedrock-agent list-knowledge-bases \
    --region "$REGION" \
    --query "knowledgeBaseSummaries[?contains(name, 'minimal')]" \
    --output table

echo ""
echo "5. Getting knowledge base details..."
KB_ID=$(aws bedrock-agent list-knowledge-bases \
    --region "$REGION" \
    --query "knowledgeBaseSummaries[?contains(name, 'fr-kb-${APPLICATION_NAME}-v2')].knowledgeBaseId" \
    --output text)

if [ -n "$KB_ID" ]; then
    echo "   Found KB ID: $KB_ID"
    echo ""
    echo "   Getting KB details..."
    aws bedrock-agent get-knowledge-base \
        --knowledge-base-id "$KB_ID" \
        --region "$REGION" \
        --query "{name:name, status:status, storageConfig:storageConfiguration}" \
        --output json
    
    echo ""
    echo "   Checking data sources..."
    aws bedrock-agent list-data-sources \
        --knowledge-base-id "$KB_ID" \
        --region "$REGION" \
        --output table
else
    echo "   ⚠️  No V2 knowledge base found"
fi

echo ""
echo "6. Checking CloudFormation stack resources..."
aws cloudformation describe-stack-resources \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "StackResources[?contains(LogicalResourceId, 'VectorIndexWithMetadataConfigV2') || contains(LogicalResourceId, 'KnowledgeBaseWithMetadataConfigV2') || contains(LogicalResourceId, 'VectorIndexV2') || contains(LogicalResourceId, 'KnowledgeBaseV2')]" \
    --output table

echo ""
echo "=== Next Steps ==="
echo "7. To test ingestion (DO THIS AFTER DEPLOYMENT):"
echo ""
echo "   a) Upload a document:"
echo "      aws s3 cp <your-document> s3://<InputBucket-from-stack-output>/"
echo ""
echo "   b) Start ingestion (get DS ID from step 5 above):"
echo "      aws bedrock-agent start-ingestion-job \\"
echo "          --knowledge-base-id $KB_ID \\"
echo "          --data-source-id <DATASOURCE_ID> \\"
echo "          --region $REGION"
echo ""
echo "   c) Check ingestion status:"
echo "      aws bedrock-agent get-ingestion-job \\"
echo "          --knowledge-base-id $KB_ID \\"
echo "          --data-source-id <DATASOURCE_ID> \\"
echo "          --ingestion-job-id <JOB_ID> \\"
echo "          --region $REGION"

