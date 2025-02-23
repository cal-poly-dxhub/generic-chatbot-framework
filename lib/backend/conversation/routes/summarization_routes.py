from francis_toolkit.utils import load_config_from_dynamodb
from francis_tooklit.types import HandoffState
import os
from typing import Optional, Iterator
from conversation_store.utils import get_chat_history_store
from conversation_store.base import BaseChatHistoryStore, ChatMessage
from summarization.summarizer import Summarizer
from aws_lambda_powertools.event_handler.api_gateway import Router
from summarization.types import HandoffConfig
from aws_lambda_powertools import Logger
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


# TODO: reasonable?
# A function attribute that counts the number of messages that have been processed
_depaginated_history.num_messages = 0  # type: ignore


@router.post("/internal/chat/<chat_id>/user/<user_id>/handoff")
def increment_handoff_requests(chat_id: str, user_id: str) -> dict:
    # TODO: handoff threshold should now be passed back
    handoff_threshold = int(router.current_event.json_body.get("handoffThreshold", 3))

    extra = {"chat_id": chat_id, "user_id": user_id, "event": "increment_handoff_requests"}
    logger.info("Count handoff requests triggered", extra=extra)

    store = get_chat_history_store()
    handoff_state = store.increment_handoff_counter(user_id, chat_id, handoff_threshold)

    return {
        "data": {"handoffState": handoff_state},
    }


@router.put("/internal/chat/<chat_id>/user/<user_id>/handoff")
def handoff_chat(chat_id: str, user_id: str) -> dict:
    print("handoff_chat")
    extra = {"chat_id": chat_id, "user_id": user_id, "event": "handoff_chat"}
    logger.info("Handoff triggered", extra=extra)
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

    return {
        "data": {
            "statusCode": 200,
            "input_tokens": summary_response["input_tokens"],
            "output_tokens": summary_response["output_tokens"],
        },
    }
