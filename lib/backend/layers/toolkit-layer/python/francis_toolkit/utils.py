# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import decimal
import json
import os
import time
from typing import Any, List, Literal, Optional, Tuple

import botocore
from langchain_core.embeddings import Embeddings
from langchain_core.retrievers import BaseRetriever

from .clients import (
    bedrock_agent_client,
    bedrock_client,
    dynamodb_resource_client,
    lambda_client,
    sagemaker_client,
    secrets_manager_client,
)
from .embeddings.bedrock_embeddings import BedrockEmbeddings
from .embeddings.sagemaker_embeddings import SagemakerEndpointEmbeddings
from .retrievers.knowledgebase_retriever import AmazonKnowledgeBasesRetriever, RetrievalConfig
from .types import EmbeddingModel


def get_embedding_models() -> List[EmbeddingModel]:
    # Load the embedding models from the environment variable
    embedding_models_json = os.getenv("EMBEDDINGS_SAGEMAKER_MODELS", "[]")
    embedding_models = [EmbeddingModel(**model) for model in json.loads(embedding_models_json)]
    return embedding_models


def find_embedding_model_by_ref_key(
    model_ref_key: Optional[str] = None,
) -> Optional[EmbeddingModel]:
    embedding_models: List[EmbeddingModel] = get_embedding_models()

    # Return the default model if no modelRefKey is provided. Default model is always placed at the first element in the list
    if not model_ref_key:
        return embedding_models[0]

    for model in embedding_models:
        if model.modelRefKey == model_ref_key:
            return model

    return None


def get_embeddings(embedding_model: EmbeddingModel) -> Embeddings:
    if embedding_model.provider == "sagemaker":
        return SagemakerEndpointEmbeddings(
            endpoint_name=embedding_model.modelEndpointName,  # type: ignore
            client=sagemaker_client,
            model_kwargs={"model": embedding_model.modelId},
        )
    elif embedding_model.provider == "bedrock":
        return BedrockEmbeddings(
            client=bedrock_client,
            model_id=embedding_model.modelId,
        )
    else:
        raise ValueError(f"Invalid provider: {embedding_model.provider}")


def get_retriever(modelRefKey: str, k: int = 5, score_threshold: float = 0.0) -> BaseRetriever:
    _retriever: BaseRetriever

    system_config = load_config_from_dynamodb(os.getenv("CONFIG_TABLE_NAME", ""), "system_configuration")

    corpus_config = system_config["ragConfig"].get("corpusConfig")

    embedding_model = find_embedding_model_by_ref_key(modelRefKey)
    if not embedding_model:
        raise ValueError(f"InvalidPayload: no embedding model found for ref key {corpus_config['embeddingModelRefKey']}.")

    if corpus_config and corpus_config["corpusType"] == "knowledgebase":
        _retriever = AmazonKnowledgeBasesRetriever(
            client=bedrock_agent_client,
            knowledge_base_id=os.getenv("KNOWLEDGE_BASE_ID", ""),
            retrieval_config=RetrievalConfig.parse_obj({"vectorSearchConfiguration": {"numberOfResults": k}}),
            min_score_confidence=score_threshold,
        )
    else:
        raise ValueError("This build only supports 'knowledgebase' corpus with S3 Vectors")

    return _retriever


def get_calling_identity(cognito_authentication_provider: str) -> Tuple[str, str]:
    provider_parts = cognito_authentication_provider.split(":")
    subject_id = provider_parts[-1]

    provider_source_parts = provider_parts[0].split("/")
    user_pool_id = provider_source_parts[-1]

    return user_pool_id, subject_id


def load_config_from_dynamodb(table_name: str, config_key: str):  # type: ignore
    """Load configuration data from a DynamoDB table.

    Args:
    ----
        table_name (str): The name of the DynamoDB table.
        config_key (str): The key for the configuration item.

    Returns:
    -------
        dict: The configuration data as a dictionary, or None if not found.
    """
    table = dynamodb_resource_client.Table(table_name)

    try:
        response = table.get_item(Key={"PK": config_key})
    except botocore.exceptions.ClientError as e:
        print(f"Error loading configuration from DynamoDB: {e.response['Error']['Message']}")
        return None

    if "Item" in response:
        return replace_decimals(response["Item"])
    else:
        print(f"Configuration with key '{config_key}' not found in DynamoDB table '{table_name}'")
        return None


def replace_decimals(obj):  # type: ignore
    """Recursively traverse the given object (list, dict, or decimal.Decimal)
    and replace any decimal.Decimal instances with their integer or float
    representation, depending on whether they are whole numbers or not.

    Args:
    ----
        obj (list, dict, decimal.Decimal, or any other object): The object to be processed.

    Returns:
    -------
        The processed object with decimal.Decimal instances replaced.
    """
    if isinstance(obj, list):
        return [replace_decimals(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: replace_decimals(value) for key, value in obj.items()}
    elif isinstance(obj, decimal.Decimal):
        if obj % 1 == 0:
            return int(obj)
        else:
            return float(obj)
    else:
        return obj


def get_timestamp() -> int:
    return int(time.time() * 1000)


def invoke_lambda_function(
    function_name: str,
    request_payload: dict,
    invocation_type: Literal["RequestResponse", "Event"] = "RequestResponse",
) -> dict:
    """Invokes a Lambda function with the given payload.

    Args:
    ----
        function_name (str): The name of the Lambda function to invoke.
        request_payload (dict): The payload to send to the Lambda function.

    Returns:
    -------
        dict: The response from the Lambda function.
    """
    try:
        # Invoke the Lambda function
        response = lambda_client.invoke(
            FunctionName=function_name,
            InvocationType=invocation_type,
            Payload=json.dumps(request_payload).encode("utf-8"),
        )

        # Parse the response payload
        response_payload = json.loads(response["Payload"].read().decode("utf-8"))

        # Check if the Lambda function execution was successful
        if 200 <= response["StatusCode"] <= 299:
            body = json.loads(response_payload["body"])
            return body["data"]  # type: ignore
        else:
            raise Exception(
                f"Lambda function execution failed with status code {response['StatusCode']}: {response_payload['errorMessage']}"
            )

    except Exception:
        raise
