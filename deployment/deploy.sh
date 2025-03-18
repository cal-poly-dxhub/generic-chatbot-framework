
# Found in the output variables of the CloudFormation stack 
# (FrancisChatbotStack-<APP_NAME>.InputBucket)
INPUT_BUCKET_NAME="<YOUR_INPUT_BUCKET_NAME>"
URL_FILE="tools/urls.txt"

# Found in the output variables of the CloudFormation stack
# (FrancisChatbotStack-<APP_NAME>.IngestionPipelineStateMachineArn<ID>)
STEP_ARN="<YOUR_STEP_ARN>"

echo "Using bucket $INPUT_BUCKET_NAME"
echo "Syncing files from S3 bucket alameda-tax-codes to $INPUT_BUCKET_NAME"
aws s3 sync s3://alameda-tax-codes/ s3://$INPUT_BUCKET_NAME

echo "Uploading files in $URL_FILE to S3 bucket $INPUT_BUCKET_NAME"
python tools/pdf_to_bucket.py $INPUT_BUCKET_NAME

aws stepfunctions start-execution --state-machine-arn $STEP_ARN --no-cli-pager
