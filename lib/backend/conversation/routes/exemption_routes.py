# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from typing import Dict, Optional
from enum import Enum
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler.api_gateway import Router
from botocore.compat import json
from conversation_store import get_chat_history_store
from .types import StoreDecisionTreeInput, CloseExemptionInput
from conversation_store.base import BaseChatHistoryStore

tracer = Tracer()
router = Router()
logger = Logger()


class DecisionTreeErrorType(str, Enum):
    """
    Types of errors that can be reported instead of a decision tree.
    """

    NO_INFORMATION = "no_information"


def report_no_information(store: BaseChatHistoryStore, chat_id: str, user_id: str):
    """
    Reports that there is no information to be found in the decision tree.
    """

    store.create_chat_message(
        user_id=user_id,
        chat_id=chat_id,
        content="I don't have enough information to help you with this. Can you please try asking another question?",
        message_type="ai",
        tokens=0,
    )


def report_decision_tree_error(chat_id: str, user_id: str, error_str: str, store: BaseChatHistoryStore):
    """
    Reports decision tree errors by creating messages.
    """
    error_dict = json.loads(error_str)

    match error_dict.get("error"):
        case DecisionTreeErrorType.NO_INFORMATION.value:
            report_no_information(store, chat_id, user_id)
        case None:
            raise ValueError("report_decision_tree_error called on a non-error")
        case _:
            raise ValueError("Invalid decision tree error type")


@router.put("/internal/chat/<chat_id>/user/<user_id>/decision-tree")
@tracer.capture_method
def store_decision_tree(chat_id: str, user_id: str) -> Dict:
    """
    Stores a decision tree as a JSON object for a chat. Simply places it in an
    appropriate field of the conversation store, for query in exemption logic.
    """

    request = StoreDecisionTreeInput(**router.current_event.json_body)

    decision_tree = request.decision_tree
    sources = request.sources
    store = get_chat_history_store()

    if decision_tree is not None and json.loads(decision_tree).get("error"):
        report_decision_tree_error(chat_id, user_id, decision_tree, store)
    else:
        store.store_decision_tree(user_id, chat_id, decision_tree, sources)

    return {
        "data": {
            "status": "success",
        },
    }


def reduce_tree(tree: dict, answers: list[str]) -> str:
    """
    Obtains the decision and formats it nicely.
    """

    FORMAT = "{}"
    answers = answers.copy()
    while answers:
        answer = answers.pop(0)
        if answer in tree:
            tree = tree[answer]
        else:
            raise ValueError("Invalid answer list for decision tree")

    if "decision" not in tree:
        raise ValueError("Decision not found in decision tree")

    return FORMAT.format(tree["decision"])


def summarize_decision_path(tree, answers):
    PREFIX = "You filled out a form: \n{}"

    path = []
    node = tree

    for answer in answers:
        if "question" in node:
            path.append(f"{node['question']} → {answer}")
            if answer in node:
                node = node[answer]
            else:
                raise ValueError("Invalid answer list for decision tree")
        else:
            raise ValueError("Invalid answer list for decision tree")

    return PREFIX.format("\n".join(path))


@router.post("/chat/<chat_id>/exemption-tree")
@tracer.capture_method
def close_exemption(chat_id: str):
    """
    Closes an exemption reasoning process with a form, logging the form-based
    interaction in the chat history and presenting the output as a message.
    Takes a list of answers and hopes a decision tree is stored in this chat.

    body: ["answer1", "answer2", ...]
    """
    request = CloseExemptionInput(**router.current_event.json_body)
    chat_history_store = get_chat_history_store()
    user_id = router.context.get("user_id", "")

    if request.answers is None:
        chat_history_store.store_decision_tree(user_id, chat_id, None, None)
        return {}

    tree, sources = chat_history_store.get_decision_tree(user_id, chat_id, parse=True)
    sources = sources if sources else []

    if not tree:
        raise ValueError("No decision tree found for this chat")

    assert isinstance(tree, dict)
    decision = reduce_tree(tree, request.answers)
    form_summary = summarize_decision_path(tree, request.answers)

    chat_history_store.store_decision_tree(user_id, chat_id, None, None)
    form_message = chat_history_store.create_chat_message(
        user_id=user_id, chat_id=chat_id, content=form_summary, message_type="human", tokens=0
    ).model_dump()
    decision_message = chat_history_store.create_chat_message(
        user_id=user_id, chat_id=chat_id, content=decision, message_type="ai", tokens=0, sources=sources
    ).model_dump()

    form_message["text"] = form_message.pop("content")
    decision_message["text"] = decision_message.pop("content")
    form_message["type"] = form_message.pop("messageType")
    decision_message["type"] = decision_message.pop("messageType")

    return {
        "question": form_message,
        "answer": decision_message,
        "sources": sources,
        "traceData": {
            "decisionTree": tree,
            "answers": request.answers,
        },
    }


@router.get("/chat/<chat_id>/exemption-tree")
@tracer.capture_method
def get_exemption_tree(chat_id: str) -> Dict:
    """
    Returns the tax exemption decision tree for a chat, if it exists.
    """

    user_id = router.context.get("user_id", "")
    chat_history_store = get_chat_history_store()
    decision_tree, _ = chat_history_store.get_decision_tree(user_id, chat_id)
    return {
        "decisionTree": decision_tree,
    }
