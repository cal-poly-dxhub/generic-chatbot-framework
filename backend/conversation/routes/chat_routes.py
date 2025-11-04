# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
from typing import Dict

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler.api_gateway import Router
from conversation_store import get_chat_history_store

from .types import CreateChatInput, UpdateChatInput
from .utils import parse_query_params

tracer = Tracer()
router = Router()
logger = Logger()


@router.get("/chat")
@tracer.capture_method
def list_chats_handler() -> Dict:
    user_id = router.context.get("user_id", "")

    chat_history_store = get_chat_history_store()

    chats = chat_history_store.list_chats(user_id)

    return {"chats": [chat.dict() for chat in chats]}


@router.put("/chat")
@tracer.capture_method
def create_chat_handler() -> Dict:
    request = CreateChatInput(**router.current_event.json_body)

    user_id = router.context.get("user_id", "")
    chat_history_store = get_chat_history_store()

    chat = chat_history_store.create_chat(user_id, request.title)

    return chat.dict()


@router.post("/chat/<chat_id>")
@tracer.capture_method
def update_chat_handler(chat_id: str) -> Dict:
    request = UpdateChatInput(**router.current_event.json_body)
    user_id = router.context.get("user_id", "")
    chat_history_store = get_chat_history_store()

    chat = chat_history_store.update_chat(user_id, chat_id, request.title)

    return chat.dict()


@router.delete("/chat/<chat_id>")
@tracer.capture_method
def delete_chat(chat_id: str) -> Dict:
    user_id = router.context.get("user_id", "")
    chat_history_store = get_chat_history_store()

    chat_history_store.delete_chat(user_id, chat_id)

    return {
        "chatId": chat_id,
    }


@router.get("/chat/<chat_id>")
@tracer.capture_method(capture_response=False)
def list_chat_messages(chat_id: str) -> Dict:
    user_id = router.context.get("user_id", "")

    page_size, ascending, next_token = parse_query_params(router.current_event.query_string_parameters)
    chat_history_store = get_chat_history_store()

    chats, next_new_token = chat_history_store.list_chat_messages(
        user_id=user_id,
        chat_id=chat_id,
        limit=page_size,
        ascending=ascending,
        next_token=next_token,
    )

    messages = [
        {
            "chatId": chat.chatId,
            "messageId": chat.messageId,
            "text": chat.content,
            "createdAt": chat.createdAt,
            "type": chat.messageType,
        }
        for chat in chats
    ]

    return {"chatMessages": messages, "nextToken": next_new_token}


@router.get("/chat/<chat_id>/message/<message_id>/source")
@tracer.capture_method(capture_response=False)
def list_message_sources(chat_id: str, message_id: str) -> Dict:
    user_id = router.context.get("user_id", "")
    chat_history_store = get_chat_history_store()

    records = chat_history_store.list_chat_message_sources(user_id, message_id)
    sources = [record.dict() for record in records]
    return {"chatMessageSources": sources}


@router.delete("/chat/<chat_id>/message/<message_id>")
@tracer.capture_method
def delete_chat_message_handler(chat_id: str, message_id: str) -> Dict:
    user_id = router.context.get("user_id", "")
    chat_history_store = get_chat_history_store()

    chat_history_store.delete_chat_message(user_id, message_id)

    return {
        "chatId": chat_id,
        "messageId": message_id,
    }
