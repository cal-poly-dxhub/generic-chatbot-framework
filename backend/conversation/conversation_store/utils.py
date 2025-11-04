# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os

from francis_toolkit.clients import dynamodb_resource_client
from francis_toolkit.utils import load_config_from_dynamodb

from .base import BaseChatHistoryStore
from .dynamodb_store import DynamoDBChatHistoryStore

_chat_history_store: BaseChatHistoryStore | None = None


def get_chat_history_store() -> BaseChatHistoryStore:
    global _chat_history_store
    if _chat_history_store is None:
        system_config = load_config_from_dynamodb(os.getenv("CONFIG_TABLE_NAME"), "system_configuration")

        table_name = os.getenv("CONVERSATION_TABLE_NAME", "")
        index_name = os.getenv("CONVERSATION_INDEX_NAME", "")

        _chat_history_store = DynamoDBChatHistoryStore(
            dynamodb_resource_client, table_name=table_name, index_name=index_name
        )
    return _chat_history_store


def update_cost(
    user_id: str,
    chat_id: str,
    input_tokens: int,
    output_tokens: int,
    model_id: str,
) -> None:
    chat_history_store = get_chat_history_store()

    # TODO: update_cost should take human/ai as message type, not user/assistant
    chat_history_store.update_cost(
        user_id=user_id,
        chat_id=chat_id,
        tokens=input_tokens,
        model_id=model_id,
        message_type="user",
    )

    chat_history_store.update_cost(
        user_id=user_id,
        chat_id=chat_id,
        tokens=output_tokens,
        model_id=model_id,
        message_type="assistant",
    )
