from typing import Optional, Literal
from pydantic import BaseModel

ModelProvider = Literal["sagemaker", "bedrock"]


# TODO: where do these types belong?
class ModelKwargs(BaseModel):
    maxTokens: Optional[int] = None
    temperature: Optional[float] = None
    topP: Optional[float] = None
    stopSequences: Optional[list[str]] = None


class ModelBase(BaseModel):
    provider: ModelProvider
    modelId: str
    region: Optional[str] = None


class LLMModelBase(ModelBase):
    modelKwargs: Optional[ModelKwargs] = None


class BedRockLLMModel(LLMModelBase):
    provider: ModelProvider = "bedrock"
    supportsSystemPrompt: bool = False


class HandoffConfig(BedRockLLMModel):
    details: Optional[list[str]] = None
