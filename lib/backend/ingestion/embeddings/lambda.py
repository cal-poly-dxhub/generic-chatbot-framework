# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import csv
import io
import json
import os
import time
from typing import List, Optional

import boto3
from aws_lambda_powertools import Logger, Metrics, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext
from botocore.exceptions import ClientError
from francis_toolkit.utils import find_embedding_model_by_ref_key, get_vector_store
from langchain.docstore.document import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from pydantic import BaseModel

logger = Logger()
tracer = Tracer()
metrics = Metrics(namespace=os.getenv("METRICS_NAMESPACE"))


CHUNK_SIZE_DOC_SPLIT = int(os.getenv("CHUNK_SIZE_DOC_SPLIT", 1000))
OVERLAP_FOR_DOC_SPLIT = int(os.getenv("OVERLAP_FOR_DOC_SPLIT", 200))
CONCAT_CSV_ROWS = os.getenv("CONCAT_CSV_ROWS", "false").lower() == "true"


class FileEmbeddingsRequest(BaseModel):
    FileURI: str
    ContentType: str
    model_ref_key: Optional[str] = None


def read_from_s3(bucket_name: str, object_key: str) -> bytes:
    """
    Read a file from an S3 bucket and return its content as bytes.

    Args:
    bucket_name (str): The name of the S3 bucket.
    object_key (str): The key (path) of the object in the bucket.

    Returns:
    content: The content of the file.

    Raises:
    Exception: If there's an error reading the file.
    """
    s3_client = boto3.client("s3")

    try:
        response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
        content = response["Body"].read()
        return content
    except Exception as e:
        raise Exception(f"An unexpected error occurred: {str(e)}")  # noqa: B904


def load_metadata(bucket_name: str, object_key: str) -> dict:
    """Load metadata from a metadata.json file."""
    metadata = {}
    metadata_key = f"{object_key}.metadata.json"
    try:
        content = read_from_s3(bucket_name, metadata_key)
        metadata.update(json.loads(content.decode()))
        return metadata
    except Exception:
        return metadata


def process_text_embeddings(content: str) -> List[Document]:
    return [Document(page_content=content)]


def process_csv_embeddings(content: str) -> List[Document]:
    csv_stream = io.StringIO(content)

    # Create a CSV reader object from the BytesIO object
    csv_reader = csv.DictReader(csv_stream)
    text_list = []

    for row in csv_reader:
        text_list.append("\n".join([f"{key}: {value}" for key, value in row.items()]))

    if CONCAT_CSV_ROWS:
        documents = [Document(page_content="\n".join(text_list))]
    else:
        documents = [Document(page_content=text) for text in text_list]

    return documents


def update_ingested_time(file_uri: str) -> bool:
    """
    Update the IngestedAt attribute to the current time for an item in DynamoDB.

    :return: True if update was successful, False otherwise
    """
    dynamodb = boto3.resource("dynamodb")
    table = dynamodb.Table(os.getenv("CACHE_TABLE_NAME"))

    current_time = int(time.time())  # Current time in Unix timestamp format

    update_expression = """
    SET IngestedAt = :ingested_time,
        UpdatedStatus = :updated_status
    """
    expression_attribute_values = {":ingested_time": current_time, ":updated_status": "INGESTED"}

    try:
        table.update_item(
            Key={"PK": f"source_location#{file_uri}", "SK": "metadata"},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues="UPDATED_NEW",
        )
        return True

    except ClientError as e:
        logger.error(f"Error updating item: {e.response['Error']['Message']}")
        return False


@logger.inject_lambda_context(log_event=True)
@tracer.capture_lambda_handler(capture_response=False)
@metrics.log_metrics(capture_cold_start_metric=True)
def handler(event: dict, context: LambdaContext) -> dict:
    request = FileEmbeddingsRequest(**event)
    file_uri = request.FileURI
    content_type = request.ContentType

    embedding_model = find_embedding_model_by_ref_key(request.model_ref_key)
    if embedding_model is None:
        raise ValueError(f"Embedding model {request.model_ref_key} not found")

    bucket_name, object_key = file_uri.replace("s3://", "").split("/", 1)
    raw_content = read_from_s3(bucket_name, object_key)

    documents = []
    metadata = load_metadata(bucket_name, object_key)

    # add additional metadata
    metadata["source"] = file_uri
    metadata["create_timestamp"] = int(time.time() * 1000)
    metadata["embeddings_model_id"] = embedding_model.modelId

    if content_type == "text/plain":
        documents = process_text_embeddings(raw_content.decode("utf-8"))

    elif content_type in ["text/csv", "application/csv"]:
        documents = process_csv_embeddings(raw_content.decode("utf-8"))

    else:
        # This shouldn't occur since unsupported types are filtered out in the ingestion pipeline.
        # Treat this as a fallback case.
        logger.debug(f"Unsupported content type: {content_type} for {file_uri}")
        # Mark the file as ingested to avoid reprocessing
        update_ingested_time(file_uri)
        return {"FileURI": file_uri, "EmbeddingsGenerated": 0}

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE_DOC_SPLIT,
        chunk_overlap=OVERLAP_FOR_DOC_SPLIT,
        length_function=len,
    )

    chunks = text_splitter.create_documents([doc.page_content for doc in documents], metadatas=[metadata for _ in documents])

    # don't create tables in the ingesiton pipeline as it may lead to race condition due to Map iterations
    vector_store = get_vector_store(embedding_model)
    embeddings = vector_store.add_documents(documents=chunks, document_source_uri=file_uri)

    update_ingested_time(file_uri)

    return {"FileURI": file_uri, "EmbeddingsGenerated": len(embeddings)}
