# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class CreateChatMessageInput(BaseModel):
    question: str
    modelRefKey: Optional[str] = None


class WebSocketChatMessageInput(BaseModel):
    chatId: str
    question: str
    tmpMessageId: str
    modelRefKey: Optional[str] = None


class ClassificationType(str, Enum):
    PROMOTION = "promotion"
    GREETINGS_FAREWELLS = "greetings_farewells"
    UNRELATED = "unrelated"
    QUESTION = "question"
    HANDOFF_REQUEST = "handoff_request"


class StreamingContext(BaseModel):
    chatId: str
    messageId: str
    connectionId: str
