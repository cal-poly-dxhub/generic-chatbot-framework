import json
import os
from datetime import datetime
from typing import Any, Dict, Optional

import boto3
import requests
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext
from opensearchpy import AWSV4SignerAuth, OpenSearch, RequestsHttpConnection

# Set up logging
logger = Logger()


def create_vector_index(client: OpenSearch, index_name: str, dims: int = 1536) -> Dict[str, Any]:
    """
    Create a vector search index with the specified dimensions

    Args:
        client: OpenSearch client instance
        index_name: Name of the index to create
        dims: Dimension of the vectors to store

    Returns:
        Dict containing the response from OpenSearch
    """

    index_body = {
        "settings": {
            "index": {
                "knn": True,
                "knn.algo_param.ef_search": 512,
            }
        },
        "mappings": {
            "properties": {
                "vector": {
                    "type": "knn_vector",
                    "dimension": dims,
                    "method": {
                        "name": "hnsw",
                        "space_type": "l2",
                        "engine": "faiss",
                        "parameters": {"ef_construction": 512, "m": 16},
                    },
                },
                "text": {"type": "text"},
                "metadata": {"type": "object"},
            }
        },
    }

    response = client.indices.create(index=index_name, body=index_body)

    return response  # type: ignore


def get_opensearch_client(host: str) -> OpenSearch:
    """
    Create and return an OpenSearch client

    Args:
        host: OpenSearch collection endpoint

    Returns:
        OpenSearch client instance
    """

    region = os.environ["AWS_REGION"]
    service = "aoss"

    credentials = boto3.Session().get_credentials()
    auth = AWSV4SignerAuth(credentials, region, service)

    client = OpenSearch(
        hosts=[{"host": host, "port": 443}],
        http_auth=auth,
        use_ssl=True,
        verify_certs=True,
        connection_class=RequestsHttpConnection,
        timeout=300,
    )

    return client


@logger.inject_lambda_context
def handler(event: dict, context: LambdaContext) -> None:
    """
    Handle CloudFormation custom resource events

    Args:
        event: CloudFormation custom resource event
        context: Lambda context object
    """
    logger.info("Received event", extra={"event": event})

    try:
        properties = event["ResourceProperties"]
        collection_endpoint = properties["CollectionEndpoint"]
        index_name = properties["IndexName"]
        vector_dimensions = int(properties.get("VectorDimensions", "1536"))

        # Remove the https:// prefix if present
        collection_endpoint = collection_endpoint.replace("https://", "")

        client = get_opensearch_client(collection_endpoint)
        physical_resource_id = f"{collection_endpoint}/{index_name}"

        if event["RequestType"] == "Create" or event["RequestType"] == "Update":
            # Check if index exists
            if not client.indices.exists(index=index_name):
                response = create_vector_index(client=client, index_name=index_name, dims=vector_dimensions)
                logger.info("Created index", extra={"index_name": index_name, "response": response})

            send_response(
                event,
                context,
                "SUCCESS",
                {"Message": f"Created index {index_name}", "IndexName": index_name, "Timestamp": datetime.utcnow().isoformat()},
                physical_resource_id,
            )

    except Exception as e:
        logger.exception("Error handling request")
        send_response(event, context, "FAILED", {"Message": f"Error: {str(e)}", "Timestamp": datetime.utcnow().isoformat()})


def send_response(
    event: dict,
    context: LambdaContext,
    response_status: str,
    response_data: dict,
    physical_resource_id: Optional[str] = None,
    no_echo: Optional[bool] = False,
) -> None:
    response_url = event["ResponseURL"]

    response_body: dict[str, Any] = {}
    response_body["Status"] = response_status
    response_body["Reason"] = "See the details in CloudWatch Log Stream: " + context.log_stream_name
    response_body["PhysicalResourceId"] = physical_resource_id or context.log_stream_name
    response_body["StackId"] = event["StackId"]
    response_body["RequestId"] = event["RequestId"]
    response_body["LogicalResourceId"] = event["LogicalResourceId"]
    response_body["NoEcho"] = no_echo
    response_body["Data"] = response_data

    json_response_body = json.dumps(response_body)

    headers = {"content-type": "application/json", "content-length": str(len(json_response_body))}

    try:
        response = requests.put(response_url, data=json_response_body, headers=headers, timeout=5)
        logger.info("Status code: " + response.reason)
    except Exception as e:
        logger.exception("exception: " + str(e))
