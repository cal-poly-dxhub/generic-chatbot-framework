#!/bin/bash

# Found in the output variables of the CloudFormation stack
# (FrancisChatbotStack-<APP_NAME>.IngestionPipelineStateMachineArn<ID>)

# Find the output variable KEY that contains "IngestionPipelineStateMachineArn"
# and assign it to the variable STEP_ARN
STEP_ARN=$(aws cloudformation describe-stacks --stack-name FrancisChatbotStack-francis-alameda | jq -r '.Stacks[0].Outputs[] | select(.OutputKey | contains("IngestionPipelineStateMachineArn")) | .OutputValue')

# Found in the output variables of the CloudFormation stack 
# (FrancisChatbotStack-<APP_NAME>.InputBucket)
export INPUT_BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name FrancisChatbotStack-francis-alameda | jq -r '.Stacks[0].Outputs[] | select(.OutputKey == "InputBucket") | .OutputValue')

sleep 3

URL_FILE="tools/urls.txt"

python3 -m venv .venv
source .venv/bin/activate
pip install -r tools/requirements.txt

echo "Syncing files from S3 bucket alameda-tax-codes to $INPUT_BUCKET_NAME"
aws s3 sync s3://alameda-tax-codes/ s3://$INPUT_BUCKET_NAME

echo "Uploading files in $URL_FILE to S3 bucket $INPUT_BUCKET_NAME"
python3 tools/pdf_to_bucket.py $INPUT_BUCKET_NAME

aws stepfunctions start-execution --state-machine-arn $STEP_ARN --no-cli-pager
