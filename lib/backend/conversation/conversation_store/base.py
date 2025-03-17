# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple, Literal

from pydantic import BaseModel


class Chat(BaseModel):
    """Base class representing a chat session."""

    chatId: str
    userId: str
    title: str
    createdAt: int
    updatedAt: int


class ChatMessageSource(BaseModel):
    """Base class representing a source of information for a message."""

    sourceId: str
    messageId: str
    pageContent: str
    metadata: dict
    createdAt: int


class ChatMessage(BaseModel):
    """Base class representing a chat message."""

    messageId: str
    messageType: str
    userId: str
    chatId: str
    content: str
    createdAt: int
    sources: Optional[List[ChatMessageSource]] = None


class BaseChatHistoryStore(ABC):
    @abstractmethod
    def create_chat(self, user_id: str, chat_title: str) -> Chat:
        raise NotImplementedError("This method should be implemented by subclasses.")

    @abstractmethod
    def update_chat(self, user_id: str, chat_id: str, chat_title: str) -> Chat:
        raise NotImplementedError("This method should be implemented by subclasses.")

    @abstractmethod
    def delete_chat(self, user_id: str, chat_id: str) -> None:
        raise NotImplementedError("This method should be implemented by subclasses.")

    @abstractmethod
    def list_chats(self, user_id: str) -> List[Chat]:
        raise NotImplementedError("This method should be implemented by subclasses.")

    @abstractmethod
    def increment_handoff_counter(self, user_id: str, chat_id: str) -> int:
        raise NotImplementedError("This method should be implemented by subclasses.")

    @abstractmethod
    def populate_handoff(self, user_id: str, chat_id: str, handoff_object: str) -> None:
        raise NotImplementedError("This method should be implemented by subclasses.")

    @abstractmethod
    def create_chat_message(
        self,
        user_id: str,
        chat_id: str,
        message_type: str,
        content: str,
        tokens: int,
        sources: Optional[List[Dict[str, Any]]] = None,
    ) -> ChatMessage:
        raise NotImplementedError("This method should be implemented by subclasses.")

    @abstractmethod
    def delete_chat_message(self, user_id: str, message_id: str) -> None:
        raise NotImplementedError("This method should be implemented by subclasses.")

    @abstractmethod
    def update_feedback(
        self, user_id: str, message_id: str, thumb: Optional[Literal["up", "down"]], feedback: Optional[str]
    ) -> None:
        raise NotImplementedError("This method should be implemented by subclasses.")

    # NOTE: to reviewer: Added this to test the Dynamo backend
    @abstractmethod
    def update_cost(self, user_id: str, chat_id: str, tokens: int, model_id: str, message_type: str) -> Chat:
        raise NotImplementedError("This method should be implemented by subclasses.")

    @abstractmethod
    def list_chat_messages(
        self, user_id: str, chat_id: str, next_token: Optional[str] = None, limit: int = 50, ascending: bool = True
    ) -> Tuple[List[ChatMessage], Optional[str]]:
        raise NotImplementedError("This method should be implemented by subclasses.")

    @abstractmethod
    def store_decision_tree(self, user_id: str, chat_id: str, decision_tree: Optional[str], sources: Optional[str]) -> None:
        raise NotImplementedError("This method should be implemented by subclasses.")

    @abstractmethod
    def get_decision_tree(
        self, user_id: str, chat_id: str, parse: bool = False
    ) -> tuple[Optional[str | dict], Optional[str | list]]:
        raise NotImplementedError("This method should be implemented by subclasses.")

    @abstractmethod
    def list_chat_message_sources(self, user_id: str, message_id: str) -> List[ChatMessageSource]:
        raise NotImplementedError("This method should be implemented by subclasses.")
