from francis_toolkit.utils import load_config_from_dynamodb
import os
from typing import Optional, Iterator
from conversation.conversation_store.utils import get_chat_history_store
from conversation.conversation_store.base import BaseChatHistoryStore, ChatMessage
from summarizer import Summarizer
from aws_lambda_powertools.event_handler.api_gateway import Router
from ..types import HandoffConfig


MESSAGES_PAGE_SIZE = 50

router = Router()


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


@router.get("/internal/user/<user_id>/chat/<chat_id>/handoff")
def handoff_chat(chat_id: str, user_id: str) -> dict:
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
    summary = summarizer.summarize(messages)
    handoff_ticket = {
        "chatId": chat_id,
        "userId": user_id,
        "numMessages": _depaginated_history.num_messages,  # type: ignore
        "summary": summary,
    }

    return handoff_ticket
