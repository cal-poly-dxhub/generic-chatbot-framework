# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os
from typing import Dict

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler.api_gateway import Router
from common.types import CreateChatMessageInput
from francis_toolkit.utils import (
    find_embedding_model_by_ref_key,
    load_config_from_dynamodb,
)
from llms.chains import run_rag_chain

tracer = Tracer()
logger = Logger()
router = Router()


@router.put("/inference/<chat_id>/message")
@tracer.capture_method
def send_message(chat_id: str) -> Dict:
    request = CreateChatMessageInput(**router.current_event.json_body)

    embedding_model = find_embedding_model_by_ref_key(request.modelRefKey)
    if not embedding_model:
        raise ValueError("Invalid model reference key")

    user_id = router.context.get("user_id")
    system_config = load_config_from_dynamodb(os.getenv("CONFIG_TABLE_NAME"), "system_configuration")

    handoff_config = system_config.get("handoffConfig", None)

    return run_rag_chain(
        llm_config=system_config["llmConfig"],
        user_id=user_id,  # type: ignore
        chat_id=chat_id,
        user_q=request.question,
        embedding_model=embedding_model,
        handoff_config=handoff_config,
    )
