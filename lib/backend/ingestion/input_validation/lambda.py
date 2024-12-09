# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import json
import os
from typing import Any, Dict, List

import boto3
from aws_lambda_powertools import Logger, Metrics, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

logger = Logger()
tracer = Tracer()
metrics = Metrics(namespace=os.getenv("METRICS_NAMESPACE"))

CACHE_TABLE_NAME = os.getenv("CACHE_TABLE_NAME")

s3_client = boto3.client("s3")
dynamodb_client = boto3.resource("dynamodb")


def list_ingestion_files() -> List[Dict]:
    table = dynamodb_client.Table(CACHE_TABLE_NAME)

    try:
        items = []
        last_evaluated_key = None

        while True:
            query_params = {
                "IndexName": "GSI1",
                "KeyConditionExpression": Key("UpdatedStatus").eq("UPDATED"),
                "ProjectionExpression": "FileURI, ContentType",
            }

            if last_evaluated_key:
                query_params["ExclusiveStartKey"] = last_evaluated_key

            response = table.query(**query_params)

            items.extend(response.get("Items", []))

            last_evaluated_key = response.get("LastEvaluatedKey")
            if not last_evaluated_key:
                break

        logger.info(f"Found {len(items)} documents to be ingested.")
        return [{"FileURI": item["FileURI"], "ContentType": item["ContentType"]} for item in items]
    except ClientError as e:
        logger.error(f"An error occurred: {e.response['Error']['Message']}")
        return []


@logger.inject_lambda_context(log_event=True)
@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
def handler(event: dict[str, Any], context: LambdaContext) -> dict:
    execution_name = event["Execution"]["Name"]
    ingestions_files = list_ingestion_files()

    s3_client.put_object(
        Bucket=os.getenv("PROCESSED_BUCKET_NAME"),
        Key=f"ingestion_input/{execution_name}/config.json",
        Body=json.dumps(ingestions_files, indent=2),
        ContentType="application/json",
    )

    is_valid = len(ingestions_files) > 0

    return {
        **event,
        "isValid": is_valid,
        "pendingDocuments": len(ingestions_files),
    }
