# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
from typing import Dict, Optional, Tuple


def parse_query_params(query_params: Optional[Dict[str, str]] = None) -> Tuple[int, bool, Optional[str]]:
    """Parse query string parameters for pagination and sorting.

    Args:
    ----
        query_params (Optional[Dict[str, str]]): A dictionary containing query string parameters.

    Returns:
    -------
        tuple[int, bool, Optional[Dict]]: A tuple containing the page size, ascending order flag, and next token.
    """
    if query_params is None:
        query_params = {}
    page_size = int(query_params.get("pageSize", 20))
    ascending = bool(query_params.get("ascending", False))
    next_token = query_params.get("nextToken", None)

    return page_size, ascending, next_token
