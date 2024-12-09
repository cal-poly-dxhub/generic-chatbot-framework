# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import uuid
from typing import Any, Dict, Generator, List, Optional, Union

from boto3.dynamodb.types import TypeDeserializer
from botocore.exceptions import ClientError
from francis_toolkit.clients import dynamodb_client, dynamodb_resource_client


def get_next_object_id() -> str:
    return str(uuid.uuid4())


def generate_next_token(params: dict) -> str:
    return f"{params['PK']}|{params['SK']}|{params['GSI1PK']}|{params.get('GSI1SK', '')}"


def parse_next_token(next_token: str) -> dict | None:
    parts = next_token.split("|")
    if len(parts) != 4:
        print(f"Invalid next_token format: {next_token}")
        return None

    PK, SK, GSI1PK, GSI1SK = parts
    return {
        "PK": PK,
        "SK": SK,
        "GSI1PK": GSI1PK,
        "GSI1SK": GSI1SK if GSI1SK else None,
    }


def get_chat_key(user_id: str, chat_id: str = "") -> dict:
    return {
        "PK": user_id,
        "SK": f"CHAT#{chat_id}",
    }


def get_chats_by_time_key(user_id: str, timestamp: Optional[Union[str, int]] = None) -> dict:
    return {
        "GSI1PK": f"{user_id}#CHAT",
        "GSI1SK": timestamp if timestamp else None,
    }


def get_chat_message_key(user_id: str, message_id: str = "") -> dict:
    return {
        "PK": user_id,
        "SK": f"MESSAGE#{message_id}",
    }


def get_chat_messages_by_time_key(user_id: str, chat_id: str, timestamp: str = "") -> dict:
    return {
        "GSI1PK": f"{user_id}#CHAT#{chat_id}",
        "GSI1SK": timestamp,
    }


def get_message_source_key(user_id: str, message_id: str, source_key: str = "") -> dict:
    return {
        "PK": user_id,
        "SK": f"SOURCE#{message_id}#{source_key}",
    }


def chunks(lst: List, chunk_size: int) -> Generator[List, None, None]:
    """Splits a list into smaller fixed-size chunks.

    Args:
    ----
        lst (List): The list to be chunked.
        chunk_size (int): The maximum size of each chunk.

    Yields:
    ------
        List: A chunk of the original list.
    """
    for i in range(0, len(lst), chunk_size):
        yield lst[i : i + chunk_size]


def bulk_delete_items(table_name: str, keys_to_delete: List[Dict]) -> None:
    """Deletes multiple items from a DynamoDB table in batches.

    :param table_name: The name of the DynamoDB table.
    :param keys_to_delete: A list of dictionaries representing the primary keys of the items to delete.
    :return: None
    """
    table = dynamodb_resource_client.Table(table_name)

    # Batch write items in chunks of 25 (maximum batch size for DynamoDB)
    for chunk in chunks(keys_to_delete, 25):
        try:
            with table.batch_writer() as batch:
                for key in chunk:
                    batch.delete_item(Key=key)
        except ClientError as e:
            print(f"Error deleting items: {e.response['Error']['Message']}")


def get_all_by_pagination(command_input: dict) -> List[Any]:
    raw_elements: List[Any] = []
    entities: List[Any] = []
    deserializer = TypeDeserializer()
    paginator = dynamodb_client.get_paginator("query")

    for page in paginator.paginate(**command_input):
        if page.get("Items"):
            raw_elements.extend(page["Items"])

    for e in raw_elements:
        entity = {k: deserializer.deserialize(v) for k, v in e.items()}
        entities.append(entity)

    return entities
