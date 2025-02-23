# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
from typing import Any, Dict, List, Optional, Tuple

from francis_toolkit.utils import get_timestamp
from francis_toolkit.types import HandoffState
from ..handoff_state import handoff_transition

from ..base import BaseChatHistoryStore, Chat, ChatMessage, ChatMessageSource
from .utils import (
    bulk_delete_items,
    generate_next_token,
    get_all_by_pagination,
    get_chat_key,
    get_chat_message_key,
    get_chat_messages_by_time_key,
    get_chats_by_time_key,
    get_message_source_key,
    get_next_object_id,
    parse_next_token,
)


from francis_toolkit.types import HandoffState


class DynamoDBChatHistoryStore(BaseChatHistoryStore):
    def __init__(
        self,
        dynamodb_resource_client: Any,
        *,
        table_name: str,
        index_name: str,
    ) -> None:
        self.dynamodb_resource_client = dynamodb_resource_client
        self.table_name = table_name
        self.index_name = index_name
        self.table = self.dynamodb_resource_client.Table(self.table_name)

    def create_chat(
        self,
        user_id: str,
        title: str,
    ) -> Chat:
        new_chat_session_id = get_next_object_id()

        timestamp = get_timestamp()
        keys = get_chat_key(user_id, new_chat_session_id)
        gsi_keys = get_chats_by_time_key(user_id, str(timestamp))

        chat = {
            "chatId": new_chat_session_id,
            "title": title,
            "createdAt": timestamp,
            "userId": user_id,
            "handoffRequests": 0,
            "handoffObject": None,
            "handoffState": HandoffState.NO_HANDOFF.value,
            **keys,
            **gsi_keys,
            "entity": "CHAT",
        }

        self.table.put_item(
            Item=chat,
        )

        return Chat(
            chatId=new_chat_session_id,
            title=title,
            createdAt=timestamp,
            updatedAt=timestamp,
            userId=user_id,
        )

    def increment_handoff_counter(self, user_id: str, chat_id: str, handoff_threshold: int) -> HandoffState:
        """
        Counts a handoff request and returns the new count of requests.
        """

        response = self.table.get_item(Key=get_chat_key(user_id, chat_id), ProjectionExpression="handoffRequests, handoffState")

        handoff_requests = response["Item"].get("handoffRequests", 0)
        old_handoff_state = HandoffState(response["Item"].get("handoffState", HandoffState.NO_HANDOFF.value))
        handoff_requests += 1

        # TODO: implement button API call for transition from UP to COMPLETING
        handoff_state = handoff_transition(old_handoff_state, handoff_requests, handoff_threshold)

        response = self.table.update_item(
            Key=get_chat_key(user_id, chat_id),
            ConditionExpression="attribute_exists(PK) and attribute_exists(SK)",
            UpdateExpression="set handoffRequests = handoffRequests + :val, handoffState = :state",
            ExpressionAttributeValues={":val": 1, ":state": handoff_state},
            ReturnValues="UPDATED_NEW",
        )

        handoff_requests = response["Attributes"]["handoffRequests"]
        updated_handoff_state = response["Attributes"]["handoffState"]
        return HandoffState(updated_handoff_state)

    def populate_handoff(self, user_id: str, chat_id: str, handoff_object: str) -> None:
        self.table.update_item(
            Key=get_chat_key(user_id, chat_id),
            ConditionExpression="attribute_exists(PK) and attribute_exists(SK)",
            UpdateExpression="set handoffObject = :handoffObject",
            ExpressionAttributeValues={":handoffObject": handoff_object},
            ReturnValues="UPDATED_NEW",
        )

    def _get_all_chat_message_ids(
        self,
        user_id: str,
        chat_id: str,
    ) -> List[Dict[str, str]]:
        keys = get_chat_messages_by_time_key(user_id, chat_id, "")

        command_input = {
            "TableName": self.table_name,
            "IndexName": self.index_name,
            "KeyConditionExpression": "GSI1PK = :GSI1PK",
            "ProjectionExpression": "PK, SK, messageId",
            "ExpressionAttributeValues": {":GSI1PK": {"S": keys["GSI1PK"]}},
        }

        return get_all_by_pagination(command_input)

    def delete_chat(self, user_id: str, chat_id: str) -> None:
        # For now we'll perform all the delete actions in a single lambda
        # We might want to consider creating a job queue for deleting the chatMessages async
        chat_message_keys = self._get_all_chat_message_ids(user_id, chat_id)

        chat_message_source_keys: List[Dict[str, str]] = []
        for message_keys in chat_message_keys:
            records = self._list_chat_message_sources(user_id, message_keys["messageId"])
            if records:
                chat_message_source_keys.extend(records)

        delete_keys = [{"PK": k["PK"], "SK": k["SK"]} for k in chat_message_keys + chat_message_source_keys]

        if chat_message_keys:
            bulk_delete_items(self.table_name, delete_keys)

        self.table.delete_item(
            Key=get_chat_key(user_id, chat_id),
            ReturnValues="ALL_OLD",
        )

    def update_chat(self, user_id: str, chat_id: str, chat_title: str) -> Chat:
        response = self.table.update_item(
            Key=get_chat_key(user_id, chat_id),
            ConditionExpression="attribute_exists(PK) and attribute_exists(SK)",
            UpdateExpression="set title = :title, updatedAt = :updatedAt",
            ExpressionAttributeValues={":title": chat_title, ":updatedAt": get_timestamp()},
            ReturnValues="ALL_NEW",
        )
        record = response["Attributes"]

        return Chat(
            chatId=chat_id,
            title=record["title"],
            createdAt=int(record["createdAt"]),
            updatedAt=int(record["updatedAt"]),
            userId=user_id,
        )

    def list_chats(self, user_id: str) -> List[Chat]:
        keys = get_chats_by_time_key(user_id, "")

        response = self.table.query(
            IndexName=self.index_name,
            KeyConditionExpression="GSI1PK = :PK",
            ExpressionAttributeValues={":PK": keys["GSI1PK"]},
            ScanIndexForward=True,
        )

        return [
            Chat(
                chatId=record["chatId"],
                title=record["title"],
                createdAt=int(record["createdAt"]),
                updatedAt=int(record.get("updatedAt", 0)),
                userId=user_id,
            )
            for record in response["Items"]
        ]

    def _list_chat_message_sources(self, user_id: str, message_id: str) -> List[Dict[str, Any]]:
        keys = get_message_source_key(user_id, message_id)
        input_params = {
            "TableName": self.table_name,
            "KeyConditionExpression": "PK = :PK and begins_with(SK, :SK)",
            "ExpressionAttributeValues": {
                ":PK": {"S": keys["PK"]},
                ":SK": {"S": keys["SK"]},
            },
            "ScanIndexForward": True,
        }

        # We've decided to return all chats for a user and then filter and paginate client side
        return get_all_by_pagination(input_params)

    def list_chat_message_sources(self, user_id: str, message_id: str) -> List[ChatMessageSource]:
        records = self._list_chat_message_sources(user_id, message_id)

        sources = [
            ChatMessageSource(
                messageId=record["messageId"],
                createdAt=int(record["createdAt"]),
                sourceId=record["sourceId"],
                pageContent=record["pageContent"],
                metadata=record["metadata"],
            )
            for record in records
        ]

        return sources

    def list_chat_messages(
        self, user_id: str, chat_id: str, next_token: Optional[str] = None, limit: int = 50, ascending: bool = True
    ) -> Tuple[List[ChatMessage], Optional[str]]:
        keys = get_chat_messages_by_time_key(user_id, chat_id, "")

        exclusive_start_key = {}
        if isinstance(next_token, str):
            parsed_token = parse_next_token(next_token)
            exclusive_start_key = {"ExclusiveStartKey": parsed_token} if parsed_token else {}

        query_input = {
            "IndexName": self.index_name,
            "KeyConditionExpression": "GSI1PK = :PK",
            "ExpressionAttributeValues": {":PK": keys["GSI1PK"]},
            "Limit": limit,
            "ScanIndexForward": ascending,
            **exclusive_start_key,
        }

        response = self.table.query(**query_input)
        messages = [
            ChatMessage(
                chatId=record["chatId"],
                userId=record["userId"],
                messageId=record["messageId"],
                content=record["data"]["content"],
                createdAt=int(record["createdAt"]),
                messageType=record["messageType"],
            )
            for record in response.get("Items", [])
        ]

        next_new_token = None
        if response.get("LastEvaluatedKey"):
            next_new_token = generate_next_token(response["LastEvaluatedKey"])

        return messages, next_new_token

    def delete_chat_message(
        self,
        user_id: str,
        message_id: str,
    ) -> None:
        keys_to_delete = []
        keys = get_chat_message_key(user_id, message_id)
        keys_to_delete.append(keys)

        message_sources_result = self._list_chat_message_sources(user_id, message_id)

        for message_source in message_sources_result:
            keys_to_delete.append(
                {
                    "PK": message_source["PK"],
                    "SK": message_source["SK"],
                }
            )

        bulk_delete_items(self.table_name, keys_to_delete)

    # TODO: actually update handoff state
    def create_chat_message(
        self, user_id: str, chat_id: str, message_type: str, content: str, sources: List[Dict[str, Any]] | None = None
    ) -> ChatMessage:
        new_chat_message_id = get_next_object_id()

        timestamp = get_timestamp()
        keys = get_chat_message_key(user_id, new_chat_message_id)
        gsi_keys = get_chat_messages_by_time_key(user_id, chat_id, str(timestamp))

        chat_message = {
            "chatId": chat_id,
            "messageId": new_chat_message_id,
            "createdAt": timestamp,
            "userId": user_id,
            "messageType": message_type,
            "data": {
                "content": content,
            },
            **keys,
            **gsi_keys,
            "entity": "MESSAGE",
        }

        self.table.put_item(
            Item=chat_message,
            ReturnValues="NONE",
        )

        chat_message_sources = []
        if sources:
            with self.table.batch_writer() as batch:
                for idx, source in enumerate(sources):
                    source_id = str(idx)
                    source_keys = get_message_source_key(user_id, new_chat_message_id, source_id)
                    message_source = {
                        **source_keys,
                        "sourceId": source_id,
                        "userId": user_id,
                        "chatId": chat_id,
                        "messageId": new_chat_message_id,
                        "createdAt": timestamp,
                        "entity": "SOURCE",
                        "pageContent": source["pageContent"],
                        "metadata": {key: str(value) for key, value in source["metadata"].items()},
                    }
                    batch.put_item(Item=message_source)
                    chat_message_sources.append(ChatMessageSource(**message_source))

        return ChatMessage(
            chatId=chat_id,
            userId=user_id,
            messageId=new_chat_message_id,
            content=content,
            createdAt=timestamp,
            messageType=message_type,
            sources=chat_message_sources,
        )
