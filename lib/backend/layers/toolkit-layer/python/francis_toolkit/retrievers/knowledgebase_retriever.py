# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
from typing import Any, Dict, List, Literal, Optional, Union

from langchain_core.callbacks import CallbackManagerForRetrieverRun
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever
from pydantic import BaseModel, ConfigDict, Field
from typing_extensions import Annotated

FilterValue = Union[Dict[str, Any], List[Any], int, float, str, bool, None]
Filter = Dict[str, FilterValue]


class SearchFilter(BaseModel):
    """Filter configuration for retrieval."""

    andAll: Optional[List["SearchFilter"]] = None
    orAll: Optional[List["SearchFilter"]] = None
    equals: Optional[Filter] = None
    greaterThan: Optional[Filter] = None
    greaterThanOrEquals: Optional[Filter] = None
    in_: Optional[Filter] = Field(None, alias="in")
    lessThan: Optional[Filter] = None
    lessThanOrEquals: Optional[Filter] = None
    listContains: Optional[Filter] = None
    notEquals: Optional[Filter] = None
    notIn: Optional[Filter] = Field(None, alias="notIn")
    startsWith: Optional[Filter] = None
    stringContains: Optional[Filter] = None

    model_config = ConfigDict(
        populate_by_name=True,
    )


class VectorSearchConfig(BaseModel, extra="allow"):
    """Configuration for vector search."""

    numberOfResults: int = 4
    filter: Optional[SearchFilter] = None
    overrideSearchType: Optional[Literal["HYBRID", "SEMANTIC"]] = None


class RetrievalConfig(BaseModel, extra="allow"):
    """Configuration for retrieval."""

    vectorSearchConfiguration: VectorSearchConfig
    nextToken: Optional[str] = None


class AmazonKnowledgeBasesRetriever(BaseRetriever):
    """`Amazon Bedrock Knowledge Bases` retrieval.

        See https://aws.amazon.com/bedrock/knowledge-bases for more info.

        Args:
            knowledge_base_id: Knowledge Base ID.
            client: boto3 client for bedrock agent runtime.
            retrieval_config: Configuration for retrieval.

    retriever = AmazonKnowledgeBasesRetriever(
        knowledge_base_id="<knowledge-base-id>",
        retrieval_config={
            "vectorSearchConfiguration": {
                "numberOfResults": 4
            }
        },
    )
    """

    knowledge_base_id: str
    client: Any
    retrieval_config: RetrievalConfig
    min_score_confidence: Annotated[Optional[float], Field(ge=0.0, le=1.0, default=None)]

    def _filter_by_score_confidence(self, docs: List[Document]) -> List[Document]:
        """
        Filter out the records that have a score confidence
        less than the required threshold.
        """
        if not self.min_score_confidence:
            return docs
        filtered_docs = [
            item
            for item in docs
            if (item.metadata.get("score") is not None and item.metadata.get("score", 0.0) >= self.min_score_confidence)
        ]
        return filtered_docs

    def _get_relevant_documents(
        self,
        query: str,
        *,
        run_manager: CallbackManagerForRetrieverRun,
    ) -> List[Document]:
        response = self.client.retrieve(
            retrievalQuery={"text": query.strip()},
            knowledgeBaseId=self.knowledge_base_id,
            retrievalConfiguration=self.retrieval_config.dict(exclude_none=True, by_alias=True),
        )
        results = response["retrievalResults"]
        documents = []
        for result in results:
            content = result["content"]["text"]
            result.pop("content")
            if "score" not in result:
                result["score"] = 0
            if "metadata" in result:
                result["source_metadata"] = result.pop("metadata")
            documents.append(
                Document(
                    page_content=content,
                    metadata=result,
                )
            )

        return self._filter_by_score_confidence(docs=documents)
