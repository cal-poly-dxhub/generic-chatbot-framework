# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import json
import uuid
from typing import Any, List, Optional

import requests
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext
from francis_toolkit.types import EmbeddingModel
from francis_toolkit.utils import get_vector_store

tracer = Tracer()
logger = Logger()


def setup_pgvector(embedding_models: List) -> None:
    logger.info("Setting up PG vector extension and tables")

    vector_store = get_vector_store(EmbeddingModel(**embedding_models[0]))

    vector_store.create_vector_extension()
    vector_store.create_tables_if_not_exists()
    vector_store.create_collection()


@logger.inject_lambda_context(log_event=True)
@tracer.capture_lambda_handler()
def handler(event: dict, context: LambdaContext) -> None:
    request_type = event["RequestType"]
    resource_properties = event["ResourceProperties"]
    embedding_models = json.loads(resource_properties["embeddingModels"])

    try:
        if request_type == "Create":
            physical_resource_id = str(uuid.uuid4())
            setup_pgvector(embedding_models)
        elif request_type == "Update":
            physical_resource_id = event["PhysicalResourceId"]
            setup_pgvector(embedding_models)
        elif request_type == "Delete":
            physical_resource_id = event["PhysicalResourceId"]
            logger.info("No action required for delete request")
        else:
            raise ValueError(f"Unknown request type: {request_type}")
        send_response(event, context, "SUCCESS", {}, physical_resource_id)
    except Exception as e:
        logger.exception("exception: " + str(e))
        send_response(event, context, "FAILED", {}, physical_resource_id)


def send_response(
    event: dict,
    context: LambdaContext,
    response_status: str,
    response_data: dict,
    physical_resource_id: Optional[str] = None,
    no_echo: Optional[bool] = False,
) -> None:
    response_url = event["ResponseURL"]

    response_body: dict[str, Any] = {}
    response_body["Status"] = response_status
    response_body["Reason"] = "See the details in CloudWatch Log Stream: " + context.log_stream_name
    response_body["PhysicalResourceId"] = physical_resource_id or context.log_stream_name
    response_body["StackId"] = event["StackId"]
    response_body["RequestId"] = event["RequestId"]
    response_body["LogicalResourceId"] = event["LogicalResourceId"]
    response_body["NoEcho"] = no_echo
    response_body["Data"] = response_data

    json_response_body = json.dumps(response_body)

    headers = {"content-type": "application/json", "content-length": str(len(json_response_body))}

    try:
        response = requests.put(response_url, data=json_response_body, headers=headers, timeout=5)
        logger.info("Status code: " + response.reason)
    except Exception as e:
        logger.exception("exception: " + str(e))
