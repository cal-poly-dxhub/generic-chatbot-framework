# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
from typing import Dict

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler.api_gateway import Router
from conversation_store import get_chat_history_store
from pydantic import BaseModel, ValidationError
from typing import Literal, Dict

tracer = Tracer()
router = Router()
logger = Logger()


class Feedback(BaseModel):
    thumb: Literal["up", "down"]
    feedback: str


@router.put("/chat/<chat_id>/message/<message_id>/feedback")
@tracer.capture_method
def update_feedback(chat_id: str, message_id: str) -> Dict:
    raw_feedback = router.current_event.json_body
    user_id = router.context.get("user_id", None)
    if not user_id:
        logger.error("No userId was found in context")
        return {}

    try:
        feedback = Feedback(**raw_feedback)
        logger.info(f"Received feedback: {feedback}")
    except ValidationError:
        logger.error(f"Invalid request body: {raw_feedback}; feedback not captured.")
        return {}

    chat_history_store = get_chat_history_store()
    chat_history_store.update_feedback(user_id, message_id, feedback.thumb, feedback.feedback)

    return {}
