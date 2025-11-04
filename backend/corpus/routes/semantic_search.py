# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
from typing import Any, Dict, Optional

from aws_lambda_powertools import Tracer
from aws_lambda_powertools.event_handler.api_gateway import Router
from francis_toolkit.utils import get_retriever
from pydantic import BaseModel

tracer = Tracer()
router = Router()


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

    kw_params: Dict[str, Any] = {}

    if request.limit:
        kw_params["k"] = int(request.limit)

    if request.threshold:
        kw_params["score_threshold"] = float(request.threshold)

    retriever = get_retriever(request.modelRefKey, **kw_params)
    response = retriever.invoke(request.question)

    documents = []
    for doc in response:
        documents.append({"pageContent": doc.page_content, "metadata": doc.metadata})

    return {
        "data": {
            "documents": documents,
        }
    }
