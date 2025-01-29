# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
#lib/backend/inference/lambda.py
import json
import os

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler import APIGatewayRestResolver, CORSConfig
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.utilities.data_classes import (
    APIGatewayProxyEvent,
)
from aws_lambda_powertools.utilities.typing import LambdaContext
from common.types import StreamingContext, WebSocketChatMessageInput
from common.websocket_utils import (
    get_connection,
    update_inference_status,
)
from francis_toolkit.utils import (
    find_embedding_model_by_ref_key,
    get_calling_identity,
    load_config_from_dynamodb,
)
from llms.chains import run_rag_chain
from routes.inference_routes import router as inference_routes

tracer = Tracer()
logger = Logger()
app = APIGatewayRestResolver(
    cors=CORSConfig(
        allow_origin="*",
        allow_headers=["*"],
    )
)
app.include_router(inference_routes)


@logger.inject_lambda_context(log_event=True, correlation_id_path=correlation_paths.API_GATEWAY_REST)
@tracer.capture_lambda_handler
def handler(event: dict, context: LambdaContext) -> dict:
    # Check if the event is from another Lambda function
    if is_lambda_invocation_event(event):
        return handle_lambda_invocation_event(event, context)
    else:
        return handle_api_gateway_event(event, context)


def is_lambda_invocation_event(event: dict) -> bool:
    return "requestContext" in event and "eventType" in event["requestContext"]


def handle_api_gateway_event(event: dict, context: LambdaContext) -> dict:
    # Process API Gateway event
    rest_api_event = APIGatewayProxyEvent(event)

    _, user_id = get_calling_identity(rest_api_event.request_context.identity.cognito_authentication_provider)
    if not user_id:
        raise ValueError("No userId was found in context")
    app.append_context(user_id=user_id)

    return app.resolve(event, context)


def handle_lambda_invocation_event(event: dict, context: LambdaContext) -> dict:  # type: ignore
    connection_id = event.get("requestContext", {}).get("connectionId")
    connection = get_connection(os.getenv("WS_CONNECTIONS_TABLE_NAME"), connection_id)  # type: ignore

    if not connection:
        raise ValueError("No connection found")

    event_body = json.loads(event.get("body", "{}"))
    event_payload = event_body.get("payload")
    request = WebSocketChatMessageInput(**event_payload)

    embedding_model = find_embedding_model_by_ref_key(request.modelRefKey)
    if not embedding_model:
        raise ValueError("Invalid model reference key")

    system_config = load_config_from_dynamodb(os.getenv("CONFIG_TABLE_NAME"), "system_configuration")
    llm_config = system_config["llmConfig"]
    streaming = llm_config.get("streaming", False)
    if not streaming:
        raise ValueError("Streaming is not enabled")

    update_inference_status(
        connection_id,
        {
            "chatId": request.chatId,
            "messageId": request.tmpMessageId,
            "operation": "HandleSendMessage",
            "status": "STARTING",
            "payload": request.question,
        },
    )

    result = run_rag_chain(
        llm_config=llm_config,
        user_id=connection["userId"],  # type: ignore
        chat_id=request.chatId,
        user_q=request.question,
        embedding_model=embedding_model,
        streaming_context=StreamingContext(chatId=request.chatId, messageId=request.tmpMessageId, connectionId=connection_id),
    )

    update_inference_status(
        connection_id,
        {
            "chatId": request.chatId,
            "messageId": request.tmpMessageId,
            "operation": "HandleSendMessage",
            "status": "SUCCESS",
            "payload": result,
        },
    )

    return {
        "statusCode": 200,
        "body": json.dumps({"data": {"message": "Success"}}),
    }
