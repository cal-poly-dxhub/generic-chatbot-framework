# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
from typing import Optional, Callable

from aws_lambda_powertools import Logger, Tracer
from common.app_trace import app_trace
from common.types import ClassificationType, StreamingContext
from common.utils import (
    format_chat_history,
    format_documents,
    get_corpus_documents,
    get_message_history,
    parse_classification_response,
    parse_qa_response,
    parse_standalone_response,
    store_messages_in_history,
)
from common.websocket_utils import stream_llm_response
from francis_toolkit.types import EmbeddingModel
from common.utils import add_and_check_handoff, HandoffState

from .models import get_llm_class, get_reranker_class

logger = Logger()
tracer = Tracer()

DEFAULT_HANDOFF_THRESHOLD = 3


def get_handoff_prompt(handoff_state: HandoffState, handoff_config: dict) -> str:
    handoff_prompts = handoff_config.get("handoffPrompts", {})
    if not handoff_prompts:
        logger.error("Handoff responses not found in handoff config (even though defaults should have been set)")
    if handoff_state == HandoffState.HANDOFF_JUST_TRIGGERED:
        return handoff_prompts.get("handoffJustTriggered", "")
    elif handoff_state == HandoffState.HANDOFF_COMPLETING:
        return handoff_prompts.get("handoffCompleting", "")
    else:  # HandoffState.NO_HANDOFF
        return handoff_prompts.get("handoffRequested", "")


@tracer.capture_method(capture_response=False)
def run_rag_chain(
    llm_config: dict,
    user_id: str,
    chat_id: str,
    user_q: str,
    embedding_model: EmbeddingModel,
    streaming_context: Optional[StreamingContext] = None,
    handoff_config: Optional[dict] = None,
) -> dict:
    app_trace.reset()
    app_trace.add("llm_config", llm_config)
    app_trace.add("user_id", user_id)
    app_trace.add("chat_id", chat_id)
    app_trace.add("question", user_q)
    app_trace.add("embedding_model_ref_key", embedding_model.modelRefKey)

    classification_type: ClassificationType = ClassificationType.QUESTION

    handoff_threshold = (
        handoff_config.get("handoffThreshold", DEFAULT_HANDOFF_THRESHOLD) if handoff_config else DEFAULT_HANDOFF_THRESHOLD
    )
    handoff_trigger_counter = lambda: add_and_check_handoff(user_id, chat_id, handoff_threshold)

    model_config = llm_config["classificationChainConfig"]["modelConfig"]

    if "classificationChainConfig" in llm_config:
        # classify the user question
        classification_response, input_tokens, output_tokens = (
            run_classification_step(
                chain_config=llm_config["classificationChainConfig"],
                question=user_q,
                on_handoff_triggered=handoff_trigger_counter,
                handoff_config=handoff_config,
            )
            or {}
        )

        app_trace.add("classification_response", classification_response)
        if "classification_type" in classification_response:
            classification_type = classification_response["classification_type"]  # type: ignore

        if (
            classification_type == ClassificationType.GREETINGS_FAREWELLS
            or classification_type == ClassificationType.UNRELATED
            or classification_type == ClassificationType.HANDOFF_REQUEST
        ):
            answer = classification_response.get("response", "")
            app_trace.add("answer", answer)

            if streaming_context is not None:
                stream_llm_response(
                    streaming_context.connectionId,
                    {
                        "chatId": streaming_context.chatId,
                        "messageId": streaming_context.messageId,
                        "chunks": [answer],
                    },
                )

            human_message, ai_message = store_messages_in_history(
                user_id=user_id, chat_id=chat_id, user_q=user_q, answer=answer, documents=[], input_tokens=input_tokens, output_tokens=output_tokens, model_id=model_config['modelId']
            )

            return {
                "question": {**human_message, "text": user_q},
                "answer": {**ai_message, "text": answer},
                "sources": ai_message.get("sources"),
                "traceData": app_trace.get_trace(),
                "handoffTriggered": classification_response.get("handoff_state"),
            }

    standalone_q = user_q
    if "standaloneChainConfig" in llm_config:
        # condense the follow up question into a standalone question
        standalone_q = run_standalone_step(
            chain_config=llm_config["standaloneChainConfig"],
            history_limit=llm_config.get("maxConversationHistory", 5),
            user_q=user_q,
            chat_id=chat_id,
            user_id=user_id,
        )
        app_trace.add("standalone_question", standalone_q)

    answer, documents, input_tokens, output_tokens = run_qa_step(
        chain_config=llm_config["qaChainConfig"],
        corpus_limit=llm_config.get("maxCorpusDocuments", 5),
        corpus_similarity_threshold=llm_config.get("corpusSimilarityThreshold", 0.25),
        question=standalone_q,
        embedding_model=embedding_model,
        reranking_config=llm_config.get("rerankingConfig"),
        classification_type=classification_type,
        streaming_context=streaming_context,
    )

    app_trace.add("answer", answer)
    app_trace.add("documents", documents)

    human_message, ai_message = store_messages_in_history(
        user_id=user_id, chat_id=chat_id, user_q=user_q, answer=answer, documents=[], input_tokens=input_tokens, output_tokens=output_tokens, model_id=model_config['modelId']
    )

    return {
        "question": {**human_message, "text": user_q},
        "answer": {**ai_message, "text": answer},
        "sources": ai_message.get("sources"),
        "traceData": app_trace.get_trace(),
    }


@tracer.capture_method(capture_response=False)
def run_qa_step(
    chain_config: dict,
    question: str,
    embedding_model: EmbeddingModel,
    corpus_limit: int,
    corpus_similarity_threshold: float,
    reranking_config: Optional[dict] = None,
    classification_type: ClassificationType = ClassificationType.QUESTION,
    streaming_context: Optional[StreamingContext] = None,
) -> tuple[str, list]:
    model_config = chain_config["modelConfig"]
    kwargs = chain_config.get("kwargs", {})

    llm = get_llm_class(model_config.get("provider"), model_config.get("region", None))
    documents = []
    context = "No context document found"

    if classification_type == ClassificationType.PROMOTION:
        context = "Refer to the associated image"
    else:
        documents = get_corpus_documents(
            question=question,
            corpus_limit=corpus_limit,
            corpus_similarity_threshold=corpus_similarity_threshold,
            model_ref_key=embedding_model.modelRefKey,
        )

        if documents:
            if reranking_config:
                reranking_model_config = reranking_config.get("modelConfig", {})
                reranker = get_reranker_class(reranking_model_config.get("provider"), reranking_model_config.get("region"))
                reranking_kwargs = reranking_config.get("kwargs", {})
                reranked_documents = reranker.rerank_text(
                    reranker_config=reranking_config, query=question, documents=documents, **reranking_kwargs
                )
                documents = reranked_documents
            context = format_documents(documents)

    kwargs["context"] = context
    kwargs["question"] = question

    llm_response, input_tokens, output_tokens = llm.call_text_llms(
        model_config=model_config,
        prompt_template=chain_config["promptTemplate"],
        prompt_variables=chain_config["promptVariables"],
        classification_type=classification_type,
        streaming_context=streaming_context,
        **kwargs,
    )

    answer = parse_qa_response(llm_response)

    return (answer, documents, input_tokens, output_tokens)


@tracer.capture_method(capture_response=False)
def run_standalone_step(chain_config: dict, history_limit: int, user_q: str, chat_id: str, user_id: str) -> str:
    history = get_message_history(user_id=user_id, chat_id=chat_id, history_limit=history_limit)

    # returns the user question if there is no conversation history
    if not history:
        return user_q

    chat_history = format_chat_history(history)

    model_config = chain_config["modelConfig"]

    llm = get_llm_class(model_config.get("provider"), model_config.get("region", None))

    kwargs = chain_config.get("kwargs", {})
    kwargs["chat_history"] = chat_history
    kwargs["question"] = user_q

    llm_response, input_tokens, output_tokens = llm.call_text_llms(
        model_config=model_config,
        prompt_template=chain_config["promptTemplate"],
        prompt_variables=chain_config["promptVariables"],
        **kwargs,
    )

    standalone_q = parse_standalone_response(llm_response) or user_q

    return standalone_q


@tracer.capture_method(capture_response=False)
def run_classification_step(
    chain_config: dict,
    question: str,
    on_handoff_triggered: Callable[[], HandoffState],
    handoff_config: Optional[dict] = None,
) -> dict[str, str] | None:
    """
    Run the classification step, keeping track of handoff state and responding accordingly if
    handoff is triggered.
    """
    model_config = chain_config["modelConfig"]
    llm = get_llm_class(model_config.get("provider"), model_config.get("region", None))

    kwargs = chain_config.get("kwargs", {})
    kwargs["question"] = question

    llm_response, input_tokens, output_tokens = llm.call_text_llms(
        model_config=model_config,
        prompt_template=chain_config["promptTemplate"],
        prompt_variables=chain_config["promptVariables"],
        **kwargs,
    )
    response = parse_classification_response(llm_response) or {}

    classification_type = response.get("classification_type", ClassificationType.QUESTION)

    handoff_state = HandoffState.NO_HANDOFF
    if handoff_config and classification_type == ClassificationType.HANDOFF_REQUEST:
        handoff_state = on_handoff_triggered()
        handoff_prompt = get_handoff_prompt(handoff_state, handoff_config)

        language = response.get("language", "English")
        if language != "English":
            language_suffix = f"Respond in the language {language}."
            handoff_prompt = f"{handoff_prompt} {language_suffix}"

        handoff_response, input_tokens, output_tokens = llm.call_text_llms(
            model_config=model_config,
            prompt_template=handoff_prompt,
            prompt_variables=[],
            **kwargs,
        )

        response["response"] = handoff_response

    response["handoff_state"] = handoff_state.value

    return response, input_tokens, output_tokens
