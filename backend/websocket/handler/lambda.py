# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import json
import os
from typing import Dict

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext
from botocore.exceptions import ClientError
from francis_toolkit.clients import dynamodb_resource_client
from francis_toolkit.utils import invoke_lambda_function

tracer = Tracer()
logger = Logger()


INFERENCE_LAMBDA_FUNC_NAME = os.getenv("INFERENCE_LAMBDA_FUNC_NAME")


@logger.inject_lambda_context(log_event=True)
@tracer.capture_lambda_handler(capture_response=False)
def handler(event: Dict, context: LambdaContext):  # type: ignore
    # Get the route key from the event
    route_key = event.get("requestContext", {}).get("routeKey")

    # Handle different routes
    if route_key == "$connect":
        return connect_handler(event)
    elif route_key == "$disconnect":
        return disconnect_handler(event)
    elif route_key == "SendChatMessage":
        return send_message_handler(event)
    else:
        return {"statusCode": 400, "body": "Invalid route"}


def connect_handler(event):  # type: ignore
    # Handle the WebSocket connection
    connection_id = event.get("requestContext", {}).get("connectionId")
    logger.info(f"Connected: {connection_id}")

    # Return the response
    return {
        "statusCode": 200,
        "body": json.dumps({"message": "Connected successfully"}),
    }


def disconnect_handler(event):  # type: ignore
    # Handle the WebSocket disconnection
    connection_id = event.get("requestContext", {}).get("connectionId")
    logger.info(f"Disconnected: {connection_id}")

    delete_connection(os.getenv("WS_CONNECTIONS_TABLE_NAME"), connection_id)

    # Return the response
    return {
        "statusCode": 200,
        "body": json.dumps({"message": "Disconnected successfully"}),
    }


def send_message_handler(event):  # type: ignore
    # Handle the message sent from the client
    invoke_lambda_function(INFERENCE_LAMBDA_FUNC_NAME, event)

    return {
        "statusCode": 200,
        "body": json.dumps({"message": "Message received successfully"}),
    }


def delete_connection(table_name: str, connection_id: str):  # type: ignore
    table = dynamodb_resource_client.Table(table_name)

    try:
        table.delete_item(Key={"PK": connection_id})
        return True
    except ClientError as e:
        logger.error(f"Error deleting item: {e.response['Error']['Message']}")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")

    return False
