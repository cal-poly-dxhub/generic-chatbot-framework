# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
from typing import Any, Dict, Optional

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler.api_gateway import Router
from francis_toolkit.utils import (
    find_embedding_model_by_ref_key,
    get_vector_store,
)
from pydantic import BaseModel

tracer = Tracer()
router = Router()
logger = Logger()


class SimilaritySearchRequest(BaseModel):
    modelRefKey: str
    question: str
    limit: Optional[int] = None
    threshold: Optional[float] = None
    filter: Optional[dict] = None


@router.post("/corpus/search")
@tracer.capture_method(capture_response=False)
def similarity_search_handler() -> Dict:
    request = SimilaritySearchRequest(**router.current_event.body)  # type: ignore

    embedding_model = find_embedding_model_by_ref_key(request.modelRefKey)
    if not embedding_model:
        raise ValueError(f"InvalidPayload: no embedding model found for ref key {request.modelRefKey}.")

    vector_store = get_vector_store(embedding_model)

    kw_params: Dict[str, Any] = {}

    if request.limit:
        kw_params["k"] = int(request.limit)

    if request.threshold:
        kw_params["threshold"] = float(request.threshold)

    response = vector_store.similarity_search_with_score(
        # TODO: filter / metadata
        query=request.question,
        **kw_params,
    )

    documents = []
    for doc, score in response:
        documents.append({"pageContent": doc.page_content, "metadata": doc.metadata, "score": score})

    return {
        "data": {
            "documents": documents,
        }
    }
