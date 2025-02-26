# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
from typing import Dict

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler import APIGatewayRestResolver, CORSConfig
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.utilities.data_classes import (
    APIGatewayProxyEvent,
)
from aws_lambda_powertools.utilities.typing import LambdaContext
from francis_toolkit.utils import get_calling_identity
from routes.chat_routes import router as chat_router
from routes.internal_routes import router as internal_router
from routes.summarization_routes import router as summarization_router

tracer = Tracer()
logger = Logger()
app = APIGatewayRestResolver(
    cors=CORSConfig(
        allow_origin="*",
        allow_headers=["*"],
    )
)

app.include_router(chat_router)
app.include_router(internal_router)
app.include_router(summarization_router)


@logger.inject_lambda_context(log_event=True, correlation_id_path=correlation_paths.API_GATEWAY_REST)
@tracer.capture_lambda_handler(capture_response=False)
def handler(event: Dict, context: LambdaContext) -> Dict:
    if not event.get("path", "").startswith("/internal"):
        rest_api_event = APIGatewayProxyEvent(event)
        # See https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
        logger.info(f"API GATEWAY EVENT: {rest_api_event}")
        _, user_id = get_calling_identity(rest_api_event.request_context.identity.cognito_authentication_provider)
        if not user_id:
            raise ValueError("No userId was found in context")
        app.append_context(user_id=user_id)

    return app.resolve(event, context)
