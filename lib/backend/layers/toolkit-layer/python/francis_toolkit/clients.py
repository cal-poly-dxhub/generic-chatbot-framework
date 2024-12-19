# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import boto3
from botocore.config import Config

sagemaker_client = boto3.client("sagemaker-runtime", config=Config(retries={"max_attempts": 15, "mode": "adaptive"}))

secrets_manager_client = boto3.client("secretsmanager")

s3_client = boto3.client("s3")

bedrock_client = boto3.client("bedrock-runtime")

bedrock_agent_client = boto3.client("bedrock-agent-runtime")

dynamodb_resource_client = boto3.resource("dynamodb")

dynamodb_client = boto3.client("dynamodb")

lambda_client = boto3.client("lambda")
