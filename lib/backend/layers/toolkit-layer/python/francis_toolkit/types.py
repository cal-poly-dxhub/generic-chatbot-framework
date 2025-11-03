# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
from enum import Enum
from typing import Any, List, Optional

from pydantic import BaseModel


class ModelHosting(str, Enum):
    BEDROCK = "bedrock"


class Document(BaseModel):
    pageContent: str
    metadata: Any
    score: Optional[float] = 0.0


class EmbeddingModel(BaseModel):
    modelId: str
    modelRefKey: str
    dimensions: int


class EmbedDocumentsRequest(BaseModel):
    texts: List[str]
    modelRefKey: Optional[str] = None


class EmbedDocumentsResponse(BaseModel):
    embeddings: List[List[float]]
    model: str


class EmbedQueryRequest(BaseModel):
    text: str
    modelRefKey: Optional[str] = None


class EmbedQueryResponse(BaseModel):
    embedding: List[float]
    model: str


class EmbeddingModelInventoryResponse(BaseModel):
    models: List[EmbeddingModel]
