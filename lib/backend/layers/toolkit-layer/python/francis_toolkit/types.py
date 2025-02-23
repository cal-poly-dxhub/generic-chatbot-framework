# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
from enum import Enum
from typing import Any, List, Optional

from pydantic import BaseModel


class ModelHosting(str, Enum):
    SAGEMAKER = "sagemaker"
    BEDROCK = "bedrock"


class HandoffState(Enum):
    NO_HANDOFF = "no_handoff"
    HANDOFF_JUST_TRIGGERED = "handoff_just_triggered"
    HANDOFF_COMPLETING = "handoff_completing"


class Document(BaseModel):
    pageContent: str
    metadata: Any
    score: Optional[float] = 0.0


class EmbeddingModel(BaseModel):
    provider: str
    modelId: str
    modelRefKey: str
    modelEndpointName: Optional[str] = None
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
