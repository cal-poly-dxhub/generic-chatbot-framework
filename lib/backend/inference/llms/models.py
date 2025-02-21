# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os
from abc import ABC, abstractmethod
from typing import Optional

import boto3
import botocore
from adapters.sagemaker_content_handler import (
    SagemakerContentHandler,
)
from aws_lambda_powertools import Logger
from common.app_trace import app_trace
from common.types import ClassificationType, StreamingContext
from common.utils import download_image_from_s3, format_template_variables
from common.websocket_utils import stream_llm_response
from francis_toolkit.types import ModelHosting

logger = Logger()

promotion_image_bytes = None


class LLMBase(ABC):
    def __init__(self, region_name: str) -> None:
        self.region_name = region_name

    @abstractmethod
    def call_text_llms(
        self,
        model_config: dict,
        prompt_template: str,
        prompt_variables: list,
        classification_type: ClassificationType = ClassificationType.QUESTION,
        streaming_context: Optional[StreamingContext] = None,
        **kwargs: dict,
    ) -> str:
        pass

class RerankerBase(ABC):
    """Base class for document reranking implementations."""
    def __init__(self, region_name: str) -> None:
        self.region_name = region_name
    
    @abstractmethod
    def rerank_text(
        self,
        reranker_config: dict,
        query: str,
        documents: list[dict],
        **kwargs: dict,
    ) -> list[dict]:
        pass

class BedrockReranker(RerankerBase):
    def __init__(self, region_name: str) -> None:
        super().__init__(region_name)
        self.client = boto3.client("bedrock-agent-runtime", region_name=region_name)

    def _format_documents_for_reranking(self, documents: list[dict]) -> list:
        return [
            {
                "type": "INLINE",
                "inlineDocumentSource": {
                    "type": "TEXT",
                    "textDocument": {
                        "text": document.get("pageContent", ""),
                    }
                }
            }
            for document in documents
        ]
    
    def _apply_reranking_order(
            self,
            reranking_response: dict,
            original_documents: list
    ) -> list[dict]:
        reranked_documents = []

        for result in reranking_response.get('results', []):
            idx = int(result['index'])
            reranked_documents.append(original_documents[idx])

        return reranked_documents

    def rerank_text(
        self,
        reranker_config: dict,
        query: str,
        documents: list,
        **kwargs: dict,
    ) -> list[dict]:
        try: 
            app_trace.add("reranking_query", query)
            app_trace.add("reranker_config", reranker_config)

            model_id = reranker_config.get("modelConfig", {}).get("modelId")
            model_arn = f"arn:aws:bedrock:{self.region_name}::foundation-model/{model_id}"

            formatted_docs = self._format_documents_for_reranking(documents)
            
            response = self.client.rerank(
                queries=[{
                    "type": "TEXT",
                    "textQuery": {
                        "text": query
                    }
                }],
                sources=formatted_docs,
                rerankingConfiguration={
                    "type": "BEDROCK_RERANKING_MODEL",
                    "bedrockRerankingConfiguration": {
                        "numberOfResults": min(len(formatted_docs), kwargs.get("numberOfResults", 10)),  
                        "modelConfiguration": {
                            "additionalModelRequestFields": kwargs.get("additionalModelRequestFields", {}),
                            "modelArn": model_arn,
                        }
                    }
                }
            )
            app_trace.add("reranker_response", response)
            
            logger.debug(f"Reranking completed for query: {query}")

            reranked_documents = self._apply_reranking_order(response, documents)
            return reranked_documents
        
        except botocore.exceptions.ClientError as err:
            logger.error("A client error occurred: %s", err.response["Error"]["Message"])
            return documents
        except Exception as err:
            logger.error("An error occurred: %s", err)
            return documents
        

class BedrockLLM(LLMBase):
    def __init__(self, region_name: str) -> None:
        super().__init__(region_name)
        self.client = boto3.client("bedrock-runtime", region_name=region_name)

    def call_text_llms(
        self,
        model_config: dict,
        prompt_template: str,
        prompt_variables: list,
        classification_type: ClassificationType = ClassificationType.QUESTION,
        streaming_context: Optional[StreamingContext] = None,
        **kwargs: dict,
    ) -> str:
        final_prompt = format_template_variables(prompt_template, prompt_variables, **kwargs)
        model_kwargs = model_config.get("modelKwargs", {})
        inference_config = {
            "maxTokens": int(model_kwargs.get("maxTokens", 1024)),
            "temperature": float(model_kwargs.get("temperature", 0)),
        }
        if "topP" in model_kwargs:
            inference_config["topP"] = float(model_kwargs["topP"])
        if "stopSequences" in model_kwargs:
            inference_config["stopSequences"] = model_kwargs["stopSequences"]

        guardrail_config = None
        if os.getenv("GUARDRAIL_ARN"):
            guardrail_config = {
                "guardrailIdentifier": os.getenv("GUARDRAIL_ARN"),
                "guardrailVersion": os.getenv("GUARDRAIL_VERSION", "DRAFT"),
                "trace": "enabled"
            }
            if streaming_context is not None:
                guardrail_config["streamProcessingMode"] = "sync"
                    
        app_trace.add("inference_config", inference_config)
        app_trace.add("prompt", final_prompt)

        content: list[dict] = [
            {"text": final_prompt},
            {
                "guardContent": {
                    "text": {
                        "text": final_prompt
                    }
                }
            }
        ] if guardrail_config else [{"text": final_prompt}]

        if classification_type == ClassificationType.PROMOTION and "promotion_image_url" in kwargs:
            global promotion_image_bytes
            if promotion_image_bytes is None:
                promotion_image_bytes = download_image_from_s3(kwargs["promotion_image_url"])  # type: ignore
            content.append({"image": {"format": "jpeg", "source": {"bytes": promotion_image_bytes}}})

        try:
            logger.debug(f"Prompt is sent to {model_config['modelId']}: {final_prompt}")
            
            converse_kwargs = {
                "modelId": model_config["modelId"],
                "messages": [
                    {
                        "role": "user",
                        "content": content,
                    },
                ],
                "system": (
                    [
                        {"text": kwargs["system_prompt"]},
                    ]
                    if "system_prompt" in kwargs
                    else []
                ),
                "inferenceConfig": inference_config,
            }

            if guardrail_config:
                converse_kwargs["guardrailConfig"] = guardrail_config

            inference_result = ""

            if streaming_context is not None:
                try:
                    response = self.client.converse_stream(**converse_kwargs)
                    for event in response["stream"]:
                        if "contentBlockDelta" in event:
                            content_delta_text = event["contentBlockDelta"]["delta"]["text"]
                            stream_llm_response(
                                streaming_context.connectionId,
                                {
                                    "chatId": streaming_context.chatId,
                                    "messageId": streaming_context.messageId,
                                    "chunks": [content_delta_text],
                                },
                            )
                            inference_result += content_delta_text
                except botocore.exceptions.ClientError as err:
                    if "ContentFilterException" in str(err):
                        app_trace.add("content_filter_exception", {
                            "error": str(err),
                            "type": "input" if "input" in str(err).lower() else "output"
                        })
                        blocked_message = (
                            kwargs.get("blocked_input_message", "Input was filtered by content safety guardrails")
                            if "input" in str(err).lower()
                            else kwargs.get("blocked_output_message", "Output was filtered by content safety guardrails")
                        )
                        stream_llm_response(
                            streaming_context.connectionId,
                            {
                                "chatId": streaming_context.chatId,
                                "messageId": streaming_context.messageId,
                                "chunks": [blocked_message],
                            },
                        )
                        return blocked_message
                    raise
            else:
                response = self.client.converse(**converse_kwargs)
                app_trace.add("inference_response", response)

                if response["stopReason"] not in (
                    "end_turn",
                    "max_tokens",
                    "stop_sequence",
                ):
                    logger.error(f"Invalid response from {model_config['modelId']}. Stop reason: {response['stopReason']}")
                    inference_result = ""
                else:
                    inference_result = response["output"]["message"]["content"][0]["text"]
                    
            logger.debug(f"Response received from {model_config['modelId']}: {inference_result}")
            return inference_result

        except botocore.exceptions.ClientError as err:
            if "ContentFilterException" in str(err):
                app_trace.add("content_filter_exception", {
                    "error": str(err),
                    "type": "input" if "input" in str(err).lower() else "output"
                })
                if "input" in str(err).lower():
                    return kwargs.get("blocked_input_message", "Input was filtered by content safety guardrails")
                return kwargs.get("blocked_output_message", "Output was filtered by content safety guardrails")
            
            logger.error("A client error occurred: %s", err.response["Error"]["Message"])
        except Exception as err:
            logger.error("An error occurred: %s", err)

        return ""


class SagemakerLLM(LLMBase):
    def __init__(self, region_name: str) -> None:
        super().__init__(region_name)
        self.client = boto3.client("sagemaker-runtime", region_name=region_name)

    def call_text_llms(
        self,
        model_config: dict,
        prompt_template: str,
        prompt_variables: list,
        classification_type: ClassificationType = ClassificationType.QUESTION,
        streaming_context: Optional[StreamingContext] = None,
        **kwargs: dict,
    ) -> str:
        prompt = format_template_variables(prompt_template, prompt_variables, **kwargs)

        label_converter = {
            "input_label": kwargs.get("input_label", "inputs"),
            "output_label": kwargs.get("output_label", "generated_text"),
            "model_kwargs_label": kwargs.get("model_kwargs_label", "parameters"),
        }

        logger.debug(f"Prompt is sent to {model_config['modelId']}: {prompt[:250]}")

        content_handler = SagemakerContentHandler(label_converter=label_converter)
        body = content_handler.transform_input(prompt=prompt, model_kwargs=model_config["modelKwargs"])

        text = ""

        try:
            if streaming_context is not None:
                response = self.client.invoke_endpoint_with_response_stream(
                    EndpointName=model_config["modelEndpointName"],
                    Body=body,
                    ContentType=content_handler.content_type,
                )

                # The streaming output text follows the pattern b'{"generated_text": "<output>"}' for Meta LlaMa 3 models
                # Adjust the logic below as needed to accommodate the specific output format of different models.
                response_bytes = b""
                filter_pattern = b'{"generated_text": "'
                content_started = False
                for event in response["Body"]:
                    chunk_bytes = event["PayloadPart"]["Bytes"]
                    response_bytes += chunk_bytes

                    if len(response_bytes) < len(filter_pattern):
                        continue

                    if not content_started:
                        if response_bytes.startswith(filter_pattern):
                            chunk_bytes = response_bytes[len(filter_pattern) :]
                        content_started = True

                    if chunk_bytes.endswith(b'"}'):
                        chunk_bytes = chunk_bytes[:-2]

                    stream_llm_response(
                        streaming_context.connectionId,
                        {
                            "chatId": streaming_context.chatId,
                            "messageId": streaming_context.messageId,
                            "chunks": [chunk_bytes.decode("utf-8")],
                        },
                    )
                text = content_handler.transform_output(response_bytes)

            else:
                response = self.client.invoke_endpoint(
                    EndpointName=model_config["modelEndpointName"],
                    Body=body,
                    ContentType=content_handler.content_type,
                    Accept=content_handler.accepts,
                )

                text = content_handler.transform_output(response["Body"])
        except Exception as e:
            raise ValueError(f"Error raised by inference endpoint: {e}")  # noqa: B904

        app_trace.add("inference_response", text)
        logger.debug(f"Response received from {model_config['modelId']}: {text[:150]}")

        return text


def get_llm_class(provider: str, region_name: Optional[str] = None) -> LLMBase:
    region_name = region_name or os.getenv("AWS_DEFAULT_REGION")

    if provider == ModelHosting.BEDROCK:
        llm_class = BedrockLLM(region_name=region_name)  # type: ignore
    else:
        llm_class = SagemakerLLM(region_name=region_name)  # type: ignore

    return llm_class

def get_reranker_class(provider: str, region_name: Optional[str] = None) -> RerankerBase:
    region_name = region_name or os.getenv("AWS_DEFAULT_REGION")

    if provider == ModelHosting.BEDROCK:
        reranker_class = BedrockReranker(region_name=region_name)  # type: ignore
    else:
        # No current implementation for non-bedrock rerankers
        raise ValueError(f"Unsupported reranker provider: %s", provider)

    return reranker_class