# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os
from typing import Optional

from aws_lambda_powertools import Logger, Metrics, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext
from francis_toolkit.utils import find_embedding_model_by_ref_key, get_vector_store
from pydantic import BaseModel

logger = Logger()
tracer = Tracer()
metrics = Metrics(namespace=os.getenv("METRICS_NAMESPACE"))


class VectorStoreMgmtRequest(BaseModel):
    purge_data: Optional[bool] = False
    model_ref_key: Optional[str] = None


@logger.inject_lambda_context(log_event=True)
@tracer.capture_lambda_handler(capture_response=False)
@metrics.log_metrics(capture_cold_start_metric=True)
def handler(event: dict, context: LambdaContext) -> None:
    request = VectorStoreMgmtRequest(**event)

    embedding_model = find_embedding_model_by_ref_key(request.model_ref_key)
    if embedding_model is None:
        raise ValueError(f"Embedding model {request.model_ref_key} not found")

    vector_store = get_vector_store(embedding_model)

    if request.purge_data:
        logger.info("Purging vector store")
        vector_store.delete_collection()
        vector_store.create_collection()
