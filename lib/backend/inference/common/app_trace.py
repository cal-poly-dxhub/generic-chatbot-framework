# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
from typing import Any


class AppTrace(object):
    def __init__(self) -> None:
        self.trace: dict[str, Any] = {}

    def add(self, name: str, value: Any) -> None:
        if name in self.trace:
            base_name = name
            counter = 1
            while f"{base_name}_{counter}" in self.trace:
                counter += 1
            name = f"{base_name}_{counter}"
        self.trace[name] = value

    def reset(self) -> None:
        self.trace = {}

    def get(self, name: str) -> Any:
        return self.trace.get(name, None)

    def get_trace(self) -> dict[str, Any]:
        return self.trace

    def __str__(self) -> str:
        return f"AppTrace: {self.trace}"


app_trace = AppTrace()
