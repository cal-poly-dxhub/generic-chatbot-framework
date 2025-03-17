# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel


class ChatIdMixin(BaseModel):
    chatId: str


class CreateChatInput(BaseModel):
    title: str


class UpdateChatInput(BaseModel):
    title: str


class DeleteChatInput(BaseModel):
    chatId: str


class CreateChatMessageInput(ChatIdMixin):
    question: str


class StoreDecisionTreeInput(BaseModel):
    decision_tree: Optional[str]
    sources: Optional[str]


class CloseExemptionInput(BaseModel):
    answers: Optional[List[str]]


class CreateInternalChatMessagesInput(BaseModel):
    content: str
    role: Literal["user", "assistant", "system"]
    sources: Optional[List[Dict[str, Any]]] = None


class UpdateCosts(BaseModel):
    tokens: int
    model_id: str
    message_type: Literal["assistant", "user"]
