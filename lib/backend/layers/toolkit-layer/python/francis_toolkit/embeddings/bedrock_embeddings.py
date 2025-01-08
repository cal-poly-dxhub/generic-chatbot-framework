# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import asyncio
import json
import os
from typing import Any, Dict, List, Optional

import numpy as np
from langchain_core.embeddings import Embeddings
from pydantic import BaseModel, ConfigDict
from langchain_core.runnables.config import run_in_executor


class BedrockEmbeddings(BaseModel, Embeddings):

    client: Any  #: :meta private:
    """Bedrock client."""
    region_name: Optional[str] = None
    """The aws region e.g., `us-west-2`. Fallsback to AWS_DEFAULT_REGION env variable
    or region specified in ~/.aws/config in case it is not provided here.
    """

    credentials_profile_name: Optional[str] = None
    """The name of the profile in the ~/.aws/credentials or ~/.aws/config files, which
    has either access keys or role information specified.
    If not specified, the default credential profile or, if on an EC2 instance,
    credentials from IMDS will be used.
    See: https://boto3.amazonaws.com/v1/documentation/api/latest/guide/credentials.html
    """

    model_id: str = "amazon.titan-embed-text-v1"
    """Id of the model to call, e.g., amazon.titan-embed-text-v1, this is
    equivalent to the modelId property in the list-foundation-models api"""

    model_kwargs: Optional[Dict] = None
    """Keyword arguments to pass to the model."""

    endpoint_url: Optional[str] = None
    """Needed if you don't want to default to us-east-1 endpoint"""

    normalize: bool = False
    """Whether the embeddings should be normalized to unit vectors"""

    model_config = ConfigDict(
        arbitrary_types_allowed=True, extra="forbid", protected_namespaces=()
    )

    def _embedding_func(self, text: str, **kwargs: Any) -> List[float]:
        """Call out to Bedrock embedding endpoint."""
        # replace newlines, which can negatively affect performance.
        text = text.replace(os.linesep, " ")

        # format input body for provider
        _model_kwargs = self.model_kwargs or {}
        input_body = {**_model_kwargs}
        if self.model_provider == "cohere":
            input_body["input_type"] = kwargs.get("input_type") or input_body.get("input_type") or "search_document"
            input_body["texts"] = [text]
        else:
            # includes common provider == "amazon"
            input_body["inputText"] = text
        body = json.dumps(input_body)

        try:
            # invoke bedrock API
            response = self.client.invoke_model(
                body=body,
                modelId=self.model_id,
                accept="application/json",
                contentType="application/json",
            )

            # format output based on provider
            response_body = json.loads(response.get("body").read())
            if self.model_provider == "cohere":
                return response_body.get("embeddings")[0]  # type: ignore
            else:
                # includes common provider == "amazon"
                return response_body.get("embedding")  # type: ignore
        except Exception as e:
            raise ValueError(f"Error raised by inference endpoint: {e}")  # noqa: B904

    def _normalize_vector(self, embeddings: List[float]) -> List[float]:
        """Normalize the embedding to a unit vector."""
        emb = np.array(embeddings)
        norm_emb = emb / np.linalg.norm(emb)
        return norm_emb.tolist()  # type: ignore

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Compute doc embeddings using a Bedrock model.

        Args:
        ----
            texts: The list of texts to embed

        Returns:
        -------
            List of embeddings, one for each text.
        """
        results = []
        kwargs = {}
        if self.model_provider == "cohere":
            kwargs["input_type"] = "search_document"

        for text in texts:
            response = self._embedding_func(text, **kwargs)

            if self.normalize:
                response = self._normalize_vector(response)

            results.append(response)

        return results

    def embed_query(self, text: str) -> List[float]:
        """Compute query embeddings using a Bedrock model.

        Args:
        ----
            text: The text to embed.

        Returns:
        -------
            Embeddings for the text.
        """
        kwargs = {}
        if self.model_provider == "cohere":
            kwargs["input_type"] = "search_query"
        embedding = self._embedding_func(text, **kwargs)

        if self.normalize:
            return self._normalize_vector(embedding)

        return embedding

    async def aembed_query(self, text: str) -> List[float]:
        """Asynchronous compute query embeddings using a Bedrock model.

        Args:
        ----
            text: The text to embed.

        Returns:
        -------
            Embeddings for the text.
        """
        return await run_in_executor(None, self.embed_query, text)

    async def aembed_documents(self, texts: List[str]) -> List[List[float]]:
        """Asynchronous compute doc embeddings using a Bedrock model.

        Args:
        ----
            texts: The list of texts to embed

        Returns:
        -------
            List of embeddings, one for each text.
        """
        result = await asyncio.gather(*[self.aembed_query(text) for text in texts])

        return list(result)

    @property
    def model_provider(self) -> str:
        return self.model_id.split(".")[0]
