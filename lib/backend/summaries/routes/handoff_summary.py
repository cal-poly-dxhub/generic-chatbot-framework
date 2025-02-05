from francis_toolkit.utils import load_config_from_dynamodb
import os
from pydantic import BaseModel
from typing import Optional, Iterator
from conversation.conversation_store.utils import get_chat_history_store
from conversation.conversation_store.base import BaseChatHistoryStore, ChatMessage
from summarizer import Summarizer
from aws_lambda_powertools.event_handler.api_gateway import Router


PROFILE_NAME = "usda"
DEFAULT_BEDROCK_MODEL = "us.amazon.nova-lite-v1:0"
MAX_TOKEN_LIMIT = 1000
DEFAULT_WINDOW_SIZE = 10
DEFAULT_WINDOW_OVERLAP_SIZE = 2
MESSAGES_PAGE_SIZE = 50

router = Router()


class HandoffModelConfig(BaseModel):
    provider: str
    modelId: str


class HandoffConfig(BaseModel):
    enableHandoff: bool
    summaryBufferMessageLimit: Optional[int] = None
    handoffModelConfig: Optional[HandoffModelConfig] = None


def _depaginated_history(
    store: BaseChatHistoryStore, chat_id: str, user_id: str, limit: int = 50, next_token: Optional[str] = None
) -> Iterator[ChatMessage]:

    while True:
        messages, next_token = store.list_chat_messages(
            user_id,
            chat_id,
            next_token=next_token,
            limit=limit,
            ascending=True,
        )

        for message in messages:
            yield message

        if not next_token:
            break


@router.get("/internal/user/<user_id>/chat/<chat_id>/handoff")
def handoff_chat(chat_id: str, user_id: str) -> dict:
    if not (table_name := os.getenv("CONFIG_TABLE_NAME")):
        raise ValueError("CONFIG_TABLE_NAME environment variable not set")

    if not (system_config := load_config_from_dynamodb(table_name, "system_configuration")):
        raise ValueError("Failed to load system configuration from DynamoDB")

    handoff_config = HandoffConfig(**system_config.get("handoffConfig"))  # type: ignore

    if not handoff_config.enableHandoff:
        raise ValueError("summarize_history was called but Handoff is not enabled")

    if not handoff_config.handoffModelConfig:
        raise ValueError("Handoff model configuration is missing but handoff is enabled")

    store = get_chat_history_store()

    messages = list(_depaginated_history(store, chat_id, user_id, limit=MESSAGES_PAGE_SIZE))

    summarizer = Summarizer(
        model_id=handoff_config.handoffModelConfig.modelId,
        window_size=DEFAULT_WINDOW_SIZE,
        window_overlap_size=DEFAULT_WINDOW_OVERLAP_SIZE,
    )

    summary = summarizer.summarize(messages)

    handoff_ticket = {
        "chatId": chat_id,
        "userId": user_id,
        "numMessages": 0,
        "summary": summary,
    }

    return handoff_ticket
