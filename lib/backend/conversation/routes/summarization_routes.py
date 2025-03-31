from francis_toolkit.utils import load_config_from_dynamodb
import os
from typing import Optional, Iterator
from conversation_store.utils import get_chat_history_store
from conversation_store.base import BaseChatHistoryStore, ChatMessage
from summarization.summarizer import Summarizer
from aws_lambda_powertools.event_handler.api_gateway import Router
from summarization.types import HandoffConfig
from aws_lambda_powertools import Logger
from conversation_store.cost_tools import update_costs
import json


MESSAGES_PAGE_SIZE = 50

router = Router()
logger = Logger()


def _depaginated_history(store: BaseChatHistoryStore, chat_id: str, user_id: str) -> Iterator[ChatMessage]:

    _depaginated_history.num_messages = 0  # type: ignore

    next_token = None
    while True:
        messages, next_token = store.list_chat_messages(
            user_id,
            chat_id,
            next_token=next_token,
            limit=MESSAGES_PAGE_SIZE,
            ascending=True,
        )

        for message in messages:
            _depaginated_history.num_messages += 1  # type: ignore
            yield message

        if not next_token:
            break


_depaginated_history.num_messages = 0  # type: ignore


@router.post("/internal/chat/<chat_id>/user/<user_id>/handoff")
def increment_handoff_requests(chat_id: str, user_id: str) -> dict:
    store = get_chat_history_store()
    num_handoff_requests = store.increment_handoff_counter(user_id, chat_id)
    return {
        "data": {
            "numHandoffRequests": num_handoff_requests,
        },
    }


@router.put("/internal/chat/<chat_id>/user/<user_id>/handoff")
def handoff_chat(chat_id: str, user_id: str) -> dict:
    logger.info("Handoff triggered")
    if not (table_name := os.getenv("CONFIG_TABLE_NAME")):
        raise ValueError("CONFIG_TABLE_NAME environment variable not set")

    if not (system_config := load_config_from_dynamodb(table_name, "system_configuration")):
        raise ValueError("Failed to load system configuration from DynamoDB")

    if not (handoff_config := system_config.get("handoffConfig")):
        raise ValueError("Failed to load handoff configuration from system configuration")

    handoff_config = HandoffConfig(**system_config.get("handoffConfig"))

    store = get_chat_history_store()
    messages = _depaginated_history(store, chat_id, user_id)

    summarizer = Summarizer(handoff_config=handoff_config)
    summary_response = summarizer.summarize(messages)

    handoff_ticket = {
        "data": {
            "chatId": chat_id,
            "userId": user_id,
            "numMessages": _depaginated_history.num_messages,  # type: ignore
            "summary": summary_response["summary"],
        }
    }

    store.populate_handoff(user_id, chat_id, json.dumps(handoff_ticket))

    update_costs(
        user_id=user_id,
        chat_id=chat_id,
        tokens=summary_response["output_tokens"],
        model_id=handoff_config.modelConfig.modelId,
        message_type="assistant",
    )

    update_costs(
        user_id=user_id,
        chat_id=chat_id,
        tokens=summary_response["input_tokens"],
        model_id=handoff_config.modelConfig.modelId,
        message_type="user",
    )

    return {
        "data": {
            "statusCode": 200,
            "input_tokens": summary_response["input_tokens"],
            "output_tokens": summary_response["output_tokens"],
        },
    }
