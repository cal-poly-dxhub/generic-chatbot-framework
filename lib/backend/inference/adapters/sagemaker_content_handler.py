# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import io
import json
import re
from abc import abstractmethod
from typing import Any, Dict, Generic, Iterator, List, Optional, TypeVar, Union

INPUT_TYPE = TypeVar("INPUT_TYPE", bound=Union[str, List[str]])
OUTPUT_TYPE = TypeVar("OUTPUT_TYPE", bound=Union[str, List[List[float]], Iterator])


def enforce_stop_tokens(text: str, stop: List[str]) -> str:
    """Cut off the text as soon as any stop words occur."""
    return re.split("|".join(stop), text, maxsplit=1)[0]


class LineIterator:
    """Parse the byte stream input.

    The output of the model will be in the following format:

    b'{"outputs": [" a"]}\n'
    b'{"outputs": [" challenging"]}\n'
    b'{"outputs": [" problem"]}\n'
    ...

    While usually each PayloadPart event from the event stream will
    contain a byte array with a full json, this is not guaranteed
    and some of the json objects may be split acrossPayloadPart events.

    For example:

    {'PayloadPart': {'Bytes': b'{"outputs": '}}
    {'PayloadPart': {'Bytes': b'[" problem"]}\n'}}


    This class accounts for this by concatenating bytes written via the 'write' function
    and then exposing a method which will return lines (ending with a '\n' character)
    within the buffer via the 'scan_lines' function.
    It maintains the position of the last read position to ensure
    that previous bytes are not exposed again.

    For more details see:
    https://aws.amazon.com/blogs/machine-learning/elevating-the-generative-ai-experience-introducing-streaming-support-in-amazon-sagemaker-hosting/
    """

    def __init__(self, stream: Any) -> None:
        self.byte_iterator = iter(stream)
        self.buffer = io.BytesIO()
        self.read_pos = 0

    def __iter__(self) -> "LineIterator":
        return self

    def __next__(self) -> Any:
        while True:
            self.buffer.seek(self.read_pos)
            line = self.buffer.readline()
            if line and line[-1] == ord("\n"):
                self.read_pos += len(line)
                return line[:-1]
            try:
                chunk = next(self.byte_iterator)
            except StopIteration:
                if self.read_pos < self.buffer.getbuffer().nbytes:
                    continue
                raise
            if "PayloadPart" not in chunk:
                # Unknown Event Type
                continue
            self.buffer.seek(0, io.SEEK_END)
            self.buffer.write(chunk["PayloadPart"]["Bytes"])


class ContentHandlerBase(Generic[INPUT_TYPE, OUTPUT_TYPE]):
    """Handler class to transform input from LLM to a
    format that SageMaker endpoint expects.

    Similarly, the class handles transforming output from the
    SageMaker endpoint to a format that LLM class expects.
    """

    """
    Example:
        .. code-block:: python

            class ContentHandler(ContentHandlerBase):
                content_type = "application/json"
                accepts = "application/json"

                def transform_input(self, prompt: str, model_kwargs: Dict) -> bytes:
                    input_str = json.dumps({prompt: prompt, **model_kwargs})
                    return input_str.encode('utf-8')

                def transform_output(self, output: bytes) -> str:
                    response_json = json.loads(output.read().decode("utf-8"))
                    return response_json[0]["generated_text"]
    """

    content_type: Optional[str] = "text/plain"
    """The MIME type of the input data passed to endpoint"""

    accepts: Optional[str] = "text/plain"
    """The MIME type of the response data returned from endpoint"""

    @abstractmethod
    def transform_input(self, prompt: INPUT_TYPE, model_kwargs: Dict) -> bytes:
        """Transforms the input to a format that model can accept
        as the request Body. Should return bytes or seekable file
        like object in the format specified in the content_type
        request header.
        """

    @abstractmethod
    def transform_output(self, output: bytes) -> OUTPUT_TYPE:
        """Transforms the output from the model to string that
        the LLM class expects.
        """


class LLMContentHandler(ContentHandlerBase[str, str]):
    """Content handler for LLM class."""


class SagemakerContentHandler(LLMContentHandler):
    """Generic content handler for Sagemaker hosted models."""

    content_type = "application/json"
    accepts = "application/json"

    def __init__(self, label_converter: Dict | None = None):
        if label_converter is None:
            label_converter = {}
        super().__init__()
        self.label_converter = label_converter

    def transform_input(self, prompt: str, model_kwargs: Dict) -> bytes:
        input_label = self.label_converter.get("input_label", "inputs")
        model_kwargs_label = self.label_converter.get("model_kwargs_label", "parameters")
        input_str = json.dumps(
            {
                input_label: prompt,
                model_kwargs_label: model_kwargs,
            }
        ).encode("utf-8")

        return input_str

    def transform_output(self, output: bytes) -> str:
        output_label = self.label_converter.get("output_label", "generated_text")

        if isinstance(output, bytes):
            data = json.loads(output.decode("utf-8"))
        else:
            data = json.loads(output.read().decode("utf-8"))

        while True:
            if isinstance(data, str):
                break
            elif isinstance(data, list):
                data = data[0]
            elif isinstance(data, dict):
                if output_label in data:
                    data = data[output_label]
                    break
                else:
                    raise ValueError(f"Generated text keys not found in output {data}.")
            else:
                raise ValueError(f"Output data contains unrecognized type {type(data)}.")

        return data  # type: ignore
