# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
from typing import Dict

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler.api_gateway import Router
from conversation_store import get_chat_history_store
from conversation_store.utils import update_cost as update_cost_store

from .types import CreateInternalChatMessagesInput, UpdateCostsInput

tracer = Tracer()
router = Router()
logger = Logger()


@router.get("/internal/user/<user_id>/chat/<chat_id>")
@tracer.capture_method(capture_response=False)
def list_internal_chat_messages(user_id: str, chat_id: str) -> Dict:
    limit = int(router.current_event.query_string_parameters.get("limit", 20))  # type: ignore
    chat_history_store = get_chat_history_store()

    messages, _ = chat_history_store.list_chat_messages(
        user_id=user_id,
        chat_id=chat_id,
        limit=limit,
    )

    return {"data": {"messages": [message.dict() for message in messages]}}


@router.put("/internal/user/<user_id>/chat/<chat_id>/message")
@tracer.capture_method(capture_response=False)
def add_internal_chat_message(user_id: str, chat_id: str) -> Dict:
    request = CreateInternalChatMessagesInput(**router.current_event.body)  # type: ignore
    chat_history_store = get_chat_history_store()

    tokens = router.current_event.body.get("tokens", 0)
    model_id = router.current_event.body.get("model_id")

    message_type = "ai" if request.role == "assistant" else "human"
    chat_message = chat_history_store.create_chat_message(
        user_id=user_id,
        chat_id=chat_id,
        content=request.content,
        message_type=message_type,
        tokens=tokens,
        sources=request.sources,
    )

    message_type = "user" if request.role == "human" else "assistant"
    chat_history_store.update_cost(
        user_id=user_id,
        chat_id=chat_id,
        tokens=tokens,
        model_id=model_id,
        message_type=request.role,
    )

    return {
        "data": {
            "message": chat_message.dict(),
        }
    }


@router.put("/internal/user/<user_id>/chat/<chat_id>/costs")
@tracer.capture_method(capture_response=False)
def update_cost(user_id: str, chat_id: str) -> Dict:
    """
    Update the costs of the conversation. If two different model IDs are
    used, two different requests should be made to this internal route.
    """

    request = UpdateCostsInput(**router.current_event.json_body)

    update_cost_store(
        user_id=user_id,
        chat_id=chat_id,
        input_tokens=request.input_tokens,
        output_tokens=request.output_tokens,
        model_id=request.model_id,
    )

    return {
        "data": {
            "message": "Costs updated",
        },
    }
