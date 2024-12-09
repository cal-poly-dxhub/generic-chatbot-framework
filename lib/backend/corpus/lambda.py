# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler import APIGatewayRestResolver, CORSConfig
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.utilities.typing import LambdaContext
from routes.embeddings import router as embeddings_router
from routes.semantic_search import router as semantic_search_router

tracer = Tracer()
logger = Logger()
app = APIGatewayRestResolver(cors=CORSConfig(allow_origin="*"))


app.include_router(semantic_search_router)
app.include_router(embeddings_router)


@logger.inject_lambda_context(log_event=True, correlation_id_path=correlation_paths.API_GATEWAY_REST)
@tracer.capture_lambda_handler(capture_response=False)
def handler(event: dict, context: LambdaContext) -> dict:
    return app.resolve(event, context)
