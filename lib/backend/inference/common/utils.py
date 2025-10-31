# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import json
import os
import re
from string import Template
from typing import Optional
from enum import Enum

import botocore
from aws_lambda_powertools import Logger, Tracer
from francis_toolkit.clients import s3_client
from francis_toolkit.utils import invoke_lambda_function

logger = Logger()
tracer = Tracer()


# Create a handoff possibilities enum
class HandoffState(Enum):
    NO_HANDOFF = "no_handoff"
    HANDOFF_JUST_TRIGGERED = "handoff_just_triggered"
    HANDOFF_COMPLETING = "handoff_completing"


CONVERSATION_LAMBDA_FUNC_NAME = os.getenv("CONVERSATION_LAMBDA_FUNC_NAME", "")
CORPUS_LAMBDA_FUNC_NAME = os.getenv("CORPUS_LAMBDA_FUNC_NAME", "")


def format_chat_history(history: list) -> str:
    return "".join(
        f"\n{'User' if item['messageType'] in ('human', 'user') else 'AI'}: {item['content']}"
        for item in history
        if item["messageType"] in ("human", "user", "ai", "assistant")
    )


def format_documents(docs: list) -> str:
    formatted_docs = []
    for doc in docs:
        pageContent = doc.get("pageContent", "")
        if pageContent:
            formatted_docs.append(f"{pageContent}")

    if formatted_docs:
        return "\n".join(formatted_docs)
    else:
        return ""


def parse_standalone_response(llm_response: str) -> Optional[str]:
    try:
        response_data: dict[str, str] = json.loads(llm_response)
        if "question" in response_data:
            return response_data["question"]
        elif "standalone_question" in response_data:
            return response_data["standalone_question"]
    except (json.JSONDecodeError, ValueError):
        # If the input is not JSON-compatible, treat it as a plain string
        pass

    return llm_response


def parse_qa_response(llm_response: str, pattern: str | None = None) -> str:
    # TODO: Handle other formating (if any) here
    final = llm_response
    if pattern:
        # e.g.: "<final_answer>(.+)?<\/final_answer>"
        found = re.findall(pattern, llm_response)
        if found and len(found) > 0:
            final = found[0]

    return final


def parse_classification_response(llm_response: str) -> dict[str, str] | None:
    try:
        response_data: dict[str, str] = json.loads(llm_response)
        return response_data
    except (json.JSONDecodeError, ValueError):
        logger.error("Unable to parse classification response. The classification response is not in json format.")

    return None


def format_template_variables(template_string: str, template_variables: list[str], **kwargs: dict) -> str:
    """Formats a template string by substituting the provided variables.

    Args:
    ----
        template_string (str): The template string containing placeholders for variables.
        template_variables (list[str]): A list of variable names to be substituted.
        **kwargs: The variables to substitute in the template string.

    Returns:
    -------
        str: The formatted string with variables substituted.
    """
    for v in template_variables:
        if v not in kwargs:
            raise ValueError(f"Missing variable '{v}' in kwargs")
        if not isinstance(kwargs[v], str):
            raise ValueError(f"Variable '{v}' must be a string")
        kwargs[v] = str(kwargs[v])  # type: ignore

    template = Template(template_string)
    return template.substitute(**kwargs)


def download_image_from_s3(s3_url: str) -> bytearray | None:
    """
    Downloads an image from the given S3 URL and returns it as a bytearray.

    Args:
        s3_url (str): The S3 URL of the image to download.

    Returns:
        bytearray: The image data as a bytearray.
    """
    # Parse the S3 URL to extract the bucket name and object key
    url_without_prefix = s3_url.replace("s3://", "")

    # Split the URL into bucket name and object key
    bucket_name, object_key = url_without_prefix.split("/", 1)

    try:
        # Download the image from S3
        response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
        image_data = response["Body"].read()

        # Convert the image data to a bytearray
        image_bytearray = bytearray(image_data)

        return image_bytearray
    except botocore.exceptions.ClientError as e:
        print(f"Error downloading image from S3: {e}")
        return None


def store_messages_in_history(
    user_id: str,
    chat_id: str,
    user_q: str,
    answer: str,
    input_tokens: int,
    output_tokens: int,
    model_id: str,
    documents: Optional[list] = None,
) -> tuple:
    human_message = create_message_in_history(role="user", message=user_q, chat_id=chat_id, user_id=user_id, tokens=input_tokens, model_id=model_id)

    ai_message = create_message_in_history(
        role="assistant",
        message=answer,
        chat_id=chat_id,
        user_id=user_id,
        tokens=output_tokens,
        model_id=model_id,
        documents=documents,
    )

    return human_message, ai_message


@tracer.capture_method
def create_message_in_history(
    user_id: str,
    chat_id: str,
    role: str,
    message: str,
    tokens: int,
    model_id: str,
    documents: Optional[list] = None,
) -> dict:
    """Put a message in the conversation history.

    Args:
    ----
        role (str): The role of the message sender (e.g., "user", "assistant").
        message (str): The message content.
        chat_id (str): The ID of the chat session.
        user_id (str): The ID of the user.
        documents (list, optional): A list of documents to include as sources.

    Returns:
    -------
        None
    """
    request_payload = {
        "path": f"/internal/user/{user_id}/chat/{chat_id}/message",
        "httpMethod": "PUT",
        "pathParameters": {"user_id": user_id, "chat_id": chat_id},
    }

    if documents:
        request_payload["body"] = {
            "role": role,
            "content": message,
            "tokens": tokens,
            "model_id": model_id,
            "sources": documents,
        }
    else:
        request_payload["body"] = {"role": role, "content": message, "tokens": tokens, "model_id": model_id}

    response = invoke_lambda_function(CONVERSATION_LAMBDA_FUNC_NAME, request_payload)

    return response["message"]  # type: ignore


@tracer.capture_method
def get_message_history(user_id: str, chat_id: str, history_limit: int = 5) -> list:
    """Get the message history for a given chat session.

    Args:
    ----
        user_id (str): The ID of the user.
        chat_id (str): The ID of the chat session.

    Returns:
    -------
        list: A list of message objects.
    """
    request_payload = {
        "path": f"/internal/user/{user_id}/chat/{chat_id}",
        "httpMethod": "GET",
        "queryStringParameters": {"limit": str(history_limit)},
        "pathParameters": {"user_id": user_id, "chat_id": chat_id},
    }

    response = invoke_lambda_function(CONVERSATION_LAMBDA_FUNC_NAME, request_payload)

    return response["messages"]  # type: ignore


@tracer.capture_method
def _account_handoff(user_id: str, chat_id: str) -> int:
    request_payload = {
        "path": f"/internal/chat/{chat_id}/user/{user_id}/handoff",
        "httpMethod": "POST",
        "pathParameters": {"user_id": user_id, "chat_id": chat_id},
    }
    response = invoke_lambda_function(CONVERSATION_LAMBDA_FUNC_NAME, request_payload)
    return int(response["numHandoffRequests"])


@tracer.capture_method
def _perform_handoff(user_id: str, chat_id: str) -> None:
    request_payload = {
        "path": f"/internal/chat/{chat_id}/user/{user_id}/handoff",
        "httpMethod": "PUT",
        "pathParameters": {"user_id": user_id, "chat_id": chat_id},
    }
    invoke_lambda_function(CONVERSATION_LAMBDA_FUNC_NAME, request_payload)
    # TODO: Account for tokens from summarization here. The call above returns
    # a dict like "{'data': {'input_tokens': <m>, 'output_tokens': <n>}}"


@tracer.capture_method
def add_and_check_handoff(user_id: str, chat_id: str, handoff_threshold: int) -> HandoffState:
    handoff_requests = _account_handoff(user_id, chat_id)

    if handoff_requests == handoff_threshold:
        _perform_handoff(user_id, chat_id)
        return HandoffState.HANDOFF_JUST_TRIGGERED
    elif handoff_requests > handoff_threshold:
        return HandoffState.HANDOFF_COMPLETING
    else:
        return HandoffState.NO_HANDOFF


@tracer.capture_method
def get_corpus_documents(
    question: str,
    model_ref_key: str,
    corpus_limit: Optional[int],
    corpus_similarity_threshold: Optional[float] = 0.5,
) -> list:
    """Invokes a Lambda function to perform a similarity search.

    Args:
    ----
        question (str): The query text for the similarity search.

    Returns:
    -------
        List of documents
    """
    request_payload = {
        "path": "/corpus/search",
        "httpMethod": "POST",
        "queryStringParameters": {},
    }
    body = {
        "question": question,
        "modelRefKey": model_ref_key,
    }

    if corpus_limit:
        body["limit"] = str(corpus_limit)
    else:
        body["threshold"] = str(corpus_similarity_threshold)

    request_payload["body"] = body

    try:
        response = invoke_lambda_function(CORPUS_LAMBDA_FUNC_NAME, request_payload)
        # Expect shape { "documents": [...] }. If missing, treat as no docs.
        documents = response.get("documents") if isinstance(response, dict) else None  # type: ignore
        if not isinstance(documents, list):
            logger.warning("Corpus lambda response missing 'documents'; proceeding with empty context")
            return []
        return documents
    except Exception as e:
        logger.error(f"Corpus search failed: {e}")
        # Fail open with no documents so the QA step can still return an answer
        return []
