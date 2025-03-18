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


class CreateInternalChatMessagesInput(BaseModel):
    content: str
    role: Literal["user", "assistant", "system"]
    sources: Optional[List[Dict[str, Any]]] = None


class UpdateCostsInput(BaseModel):
    input_tokens: int
    output_tokens: int
    model_id: str
