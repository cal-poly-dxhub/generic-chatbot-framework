from typing import Optional
from pydantic import BaseModel


# TODO: where do these types belong?
class ModelKwargs(BaseModel):
    maxTokens: Optional[int] = None
    temperature: Optional[float] = None
    topP: Optional[float] = None
    stopSequences: list[str] = []


class BedRockLLMModel(BaseModel):
    modelId: str
    region: Optional[str] = None
    modelKwargs: Optional[ModelKwargs] = None
    supportsSystemPrompt: bool = False


class HandoffConfig(BaseModel):
    modelConfig: BedRockLLMModel
    details: Optional[list[str]] = None
    handoffThreshold: int
