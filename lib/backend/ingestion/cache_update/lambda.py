# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os
import time
from typing import Any, Dict, Optional

import boto3
from aws_lambda_powertools import Logger, Tracer

logger = Logger()
tracer = Tracer()


dynamodb = boto3.resource("dynamodb")
s3_client = boto3.client("s3")

CACHE_TABLE_NAME: str = os.environ["CACHE_TABLE_NAME"]
cache_table = dynamodb.Table(CACHE_TABLE_NAME)


@logger.inject_lambda_context(log_event=True)
@tracer.capture_lambda_handler
def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    records = event["Records"]
    logger.debug(f"Processing {len(records)} records")

    for record in records:
        bucket_name = record["s3"]["bucket"]["name"]
        object_key = record["s3"]["object"]["key"]
        s3_uri = f"s3://{bucket_name}/{object_key}"

        try:
            response = s3_client.head_object(Bucket=bucket_name, Key=object_key)
            content_type = response["ContentType"]

            if content_type not in ["text/plain", "text/csv", "application/csv"]:
                logger.debug(f"Content type {content_type} for {s3_uri} is not supported. Skipping...")
                continue

            etag = response["ETag"].strip('"')

            item = get_item(s3_uri)
            if item and item.get("ETag") == etag:
                logger.info(f"File {s3_uri} has not changed, skipping update")
                continue

            new_item = {
                "PK": f"source_location#{s3_uri}",
                # The value metadata is placeholder for future extensions to support more use cases
                "SK": "metadata",
                # SK for GSI
                "FileURI": s3_uri,
                "ContentType": content_type,
                "Size": response["ContentLength"],
                "ETag": etag,
                "UpdatedAt": int(time.time()),
                # PK for GSI
                "UpdatedStatus": "UPDATED",
            }

            cache_table.put_item(Item=new_item)
        except Exception as e:
            logger.error(f"Error processing file {object_key} from bucket {bucket_name}: {str(e)}")
            raise e

    return {"statusCode": 200, "body": {"message": f"S3 trigger processed {len(records)} successfully"}}


def get_item(s3_uri: str) -> Optional[Dict[str, Any]]:
    try:
        response = cache_table.get_item(Key={"PK": f"source_location#{s3_uri}", "SK": "metadata"})
        return response.get("Item")  # type: ignore
    except Exception:
        logger.info(f"The file {s3_uri} doesn't exist in DynamoDB")
        return None
