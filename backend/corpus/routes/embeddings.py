# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler.api_gateway import Router
from francis_toolkit.types import (
    EmbedDocumentsRequest,
    EmbedDocumentsResponse,
    EmbedQueryRequest,
    EmbedQueryResponse,
)
from francis_toolkit.utils import find_embedding_model_by_ref_key, get_embeddings

tracer = Tracer()
router = Router()
logger = Logger()


@router.post("/corpus/embedding/embed-query")
@tracer.capture_method
def embed_query() -> dict:
    request = EmbedQueryRequest(**router.current_event.json_body)
    embedding_model = find_embedding_model_by_ref_key(request.modelRefKey)

    if not embedding_model:
        raise ValueError(f"InvalidPayload: no embedding model found for ref key {request.modelRefKey}.")

    embeddings = get_embeddings(embedding_model)

    query_embedding = embeddings.embed_query(request.text)

    return EmbedQueryResponse(embedding=query_embedding, model=embedding_model.modelId).dict()  # type: ignore


@router.post("/corpus/embedding/embed-documents")
@tracer.capture_method
def embed_documents() -> dict:
    request = EmbedDocumentsRequest(**router.current_event.json_body)
    embedding_model = find_embedding_model_by_ref_key(request.modelRefKey)
    if not embedding_model:
        raise ValueError(f"InvalidPayload: no embedding model found for ref key {request.modelRefKey}.")

    embeddings = get_embeddings(embedding_model)
    document_embeddings = embeddings.embed_documents(request.texts)

    return EmbedDocumentsResponse(embeddings=document_embeddings, model=embedding_model.modelId).dict()  # type: ignore
