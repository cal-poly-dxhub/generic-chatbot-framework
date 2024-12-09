# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os

from francis_toolkit.clients import dynamodb_resource_client
from francis_toolkit.utils import get_rds_connection_string, load_config_from_dynamodb

from .base import BaseChatHistoryStore
from .dynamodb_store import DynamoDBChatHistoryStore
from .postgres_store import PostgresChatHistoryStore

_chat_history_store: BaseChatHistoryStore | None = None


def get_chat_history_store() -> BaseChatHistoryStore:
    global _chat_history_store
    if _chat_history_store is None:
        system_config = load_config_from_dynamodb(os.getenv("CONFIG_TABLE_NAME"), "system_configuration")

        table_name = os.getenv("CONVERSATION_TABLE_NAME", "")
        index_name = os.getenv("CONVERSATION_INDEX_NAME", "")

        chat_history_config = system_config.get("chatHistoryConfig", {})
        if chat_history_config.get("storeType") == "aurora_postgres":
            _chat_history_store = PostgresChatHistoryStore(connection=get_rds_connection_string())
        else:
            _chat_history_store = DynamoDBChatHistoryStore(dynamodb_resource_client, table_name=table_name, index_name=index_name)
    return _chat_history_store
