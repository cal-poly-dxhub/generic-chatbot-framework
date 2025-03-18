
# Found in the output variables of the CloudFormation stack 
# (FrancisChatbotStack-<APP_NAME>.InputBucket)
INPUT_BUCKET_NAME="assessors-handbook"
URL_FILE="urls.txt"

cd tools

echo "Using bucket $INPUT_BUCKET_NAME"
echo "Syncing files from S3 bucket alameda-tax-codes to $INPUT_BUCKET_NAME"
aws s3 sync s3://alameda-tax-codes/ s3://$INPUT_BUCKET_NAME

echo "Uploading files in $URL_FILE to S3 bucket $INPUT_BUCKET_NAME"
python pdf_to_bucket.py $INPUT_BUCKET_NAME
