from typing import Optional, Iterator
import boto3
from conversation_store.base import ChatMessage
from .types import ModelKwargs, HandoffConfig, BedRockLLMModel
from aws_lambda_powertools import Logger


FAILED_TO_SUMMARIZE = "Summarizer failed to generate a response."


class Summarizer:
    def __init__(self, handoff_config: HandoffConfig):

        self.logger = Logger()
        self.handoff_config = handoff_config

        self.bedrock = boto3.client("bedrock-runtime")
        self.model_id = handoff_config.modelConfig.modelId
        self.use_system_prompt = handoff_config.modelConfig.supportsSystemPrompt

        self.inference_config = self._create_inference_config(handoff_config.modelConfig)

        # A model prompt consists of a role definition, a prompt describing the summarization task,
        # a conversation, and a tail prompt (which includes a list of types of details to focus on)

        self.role_definition = str(
            "You are a detailed note-taker for a customer service chatbot that helps "
            "users solve technical issues. You carefully read through conversations "
            "and focus on the details you're asked to find by the system. Do not "
            "output anything except text."
        )

        # For extending a summary, currently not used
        self.recursive_prompt = lambda summary: (
            f"This is a summary of the conversation so far:\n\n{summary}\n\n"
            "Extend the summary by taking into account the new messages below. "
            "Be sure to return a summary of the whole conversation, not just the "
            "new messages. Use bullet points, being sure to add new bullet points to "
            "reflect these new messages. Feel free to modify the summary to make it more "
            "concise, but make sure to keep all the important details.",
        )

        # For creating a new summary
        self.base_prompt: str = str(
            "Create a summary of the conversation below that captures the key "
            "points of the conversation. Keep the summary to a few bullet points."
        )

        # Separates instructions from conversation in the prompt
        self.conv_start_delim = "CONVERSATION START:"
        self.conv_end_delim = "CONVERSATION END"

        # Tail prompt contains details about what to focus on, provided from config
        self.tail_prompt = ""
        if handoff_config.details:
            types_of_details = self._details_string(handoff_config.details or [])
            self.tail_prompt: str = (
                "Especially focus on the following types of details:\n"
                f"{types_of_details}\n"
                "...as well as any other details that are important to the purpose of the conversation."
            )

    def _details_string(self, details: list[str]) -> str:
        return "\n".join([f"- {detail}" for detail in details])

    def _conversator_name(self, message_type: str) -> str:
        match message_type:
            case "ai":
                return "Ai"
            case "human":
                return "Human"
            case _:
                return "Unknown"

    def _create_conversation_string(self, messages: Iterator[ChatMessage]) -> str:
        return "\n\n".join([f"{self._conversator_name(m.messageType)}: {m.content}" for m in messages])

    def _create_inference_config(self, model_config: BedRockLLMModel) -> dict:
        model_kwargs = model_config.modelKwargs
        self.logger.info(f"Model kwargs: {model_kwargs}")
        inference_config = model_kwargs.model_dump(mode="python") if model_kwargs else {}
        return inference_config

    def _create_summarization_prompt(
        self,
        messages: Iterator[ChatMessage],
        existing_summary=None,
    ) -> dict:
        if existing_summary:
            task_prompt = self.recursive_prompt(existing_summary)
        else:
            task_prompt = self.base_prompt

        conversation = self._create_conversation_string(messages)

        complete_prompt_components = [
            task_prompt,
            self.conv_start_delim,
            conversation,
            self.conv_end_delim,
        ]

        if self.tail_prompt:
            complete_prompt_components.append(self.tail_prompt)

        if self.use_system_prompt:
            # Add the role definition to the system prompts
            complete_prompt = "\n\n".join(complete_prompt_components)
            return {
                "prompt": complete_prompt,
                "system_prompts": [{"text": self.role_definition}],
            }
        else:
            # Add the role definition to the user prompt
            complete_prompt = "\n\n".join([self.role_definition] + complete_prompt_components)
            return {"prompt": complete_prompt}

    def _non_text_response_types(self, response: dict) -> set:
        response_content = response["output"]["message"]["content"]
        content_types = set()
        for content in response_content:
            content_types.update(content.keys())
        return content_types - {"text"}

    def summarize(self, francis_messages: Iterator[ChatMessage]) -> dict:
        # Create a prompt for the model (instructions + annotated conversation)
        prompt = self._create_summarization_prompt(francis_messages)

        # Bedrock request setup
        messages = [{"role": "user", "content": [{"text": prompt["prompt"]}]}]
        system_prompts = prompt.get("system_prompts", None)
        converse_kwargs = {
            "modelId": self.handoff_config.modelConfig.modelId,
            "messages": messages,
            "inferenceConfig": self.inference_config,
        }
        converse_kwargs |= {"system": system_prompts} if system_prompts else {}

        input_tokens = 0
        output_tokens = 0

        # Make the Bedrock call
        try:
            response = self.bedrock.converse(**converse_kwargs)
        except Exception as e:
            self.logger.error(f"Error while summarizing messages: {e}")
            return {"summary": FAILED_TO_SUMMARIZE, "input_tokens": input_tokens, "output_tokens": output_tokens}

        # Check for unexpected stop reasons or non-text content
        if response.get("stopReason") not in [
            "end_turn",
            "stop_sequence",
            "max_tokens",
        ]:
            self.logger.error(f"Unexpected stop reason from model {self.model_id}: {response.get('stop_reason')}")
            if response.get("usage"):
                if response["usage"].get("inputTokens"):
                    input_tokens = response["usage"]["inputTokens"]

                if response["usage"].get("outputTokens"):
                    output_tokens = response["usage"]["outputTokens"]

            return {"summary": FAILED_TO_SUMMARIZE, "input_tokens": input_tokens, "output_tokens": output_tokens}

        if non_text_types := self._non_text_response_types(response):
            self.logger.error(f"Unexpected response mode; did not expect non-text content: {non_text_types}")

        # Aggregate all text outputs from the response
        response_content = response["output"]["message"]["content"]
        text_outputs = [content.get("text") for content in response_content if "text" in content]
        summary = "\n\n".join(text_outputs)

        response = {
            "summary": summary,
            "input_tokens": response["usage"]["inputTokens"],
            "output_tokens": response["usage"]["outputTokens"],
        }

        return response
