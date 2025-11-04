# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import json
import os

import boto3
from botocore.exceptions import ClientError
from francis_toolkit.clients import dynamodb_resource_client

# Create a Boto3 client for API Gateway Management API
apigw_mgmt_client = boto3.client("apigatewaymanagementapi", endpoint_url=os.environ.get("WEBSOCKET_CALLBACK_URL"))


def get_connection(table_name: str, connection_id: str) -> dict:
    table = dynamodb_resource_client.Table(table_name)

    try:
        response = table.get_item(Key={"PK": connection_id})
        return response.get("Item", None)  # type: ignore
    except ClientError as e:
        print(f"Error retrieving item: {e.response['Error']['Message']}")
        raise
    except Exception as e:
        print(f"Unexpected error: {e}")
        raise


def stream_llm_response(connection_id: str, input_data: dict) -> None:
    """Send a message to a connected client with the route 'StreamLLMResponse'."""
    payload = {"route": "StreamLLMResponse", "payload": input_data}
    post_to_connection(connection_id, payload)


def update_inference_status(connection_id: str, input_data: dict) -> None:
    """Send a message to a connected client with the route 'UpdateInferenceStatus'."""
    payload = {"route": "UpdateInferenceStatus", "payload": input_data}
    post_to_connection(connection_id, payload)


def post_to_connection(connection_id: str, input_data: dict) -> None:
    """Send a message to a connected client."""
    apigw_mgmt_client.post_to_connection(Data=json.dumps(input_data).encode("utf-8"), ConnectionId=connection_id)
