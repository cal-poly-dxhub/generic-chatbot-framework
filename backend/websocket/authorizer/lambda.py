# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import json
import os
from typing import Dict

import boto3
import jwt
import requests
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.utilities.typing import LambdaContext
from botocore.exceptions import ClientError

tracer = Tracer()
logger = Logger()


def add_connection(table_name: str, item: dict):  # type: ignore
    dynamodb = boto3.resource("dynamodb")
    table = dynamodb.Table(table_name)

    try:
        table.put_item(Item=item)
    except ClientError as e:
        logger.error(f"Error inserting item: {e.response['Error']['Message']}")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")


@logger.inject_lambda_context(log_event=True, correlation_id_path=correlation_paths.API_GATEWAY_REST)
@tracer.capture_lambda_handler(capture_response=False)
def handler(event: Dict, context: LambdaContext):  # type: ignore
    token = event["queryStringParameters"].get("idToken")
    if not token:
        return generate_policy("Deny", event["methodArn"])

    region = os.getenv("AWS_REGION")
    user_pool_id = os.getenv("COGNITO_USER_POOL_ID")
    cognito_client_id = os.getenv("COGNITO_APP_CLIENT_ID")

    try:
        # Fetch the JWKS
        jwks_url = f"https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json"
        response = requests.get(jwks_url, timeout=5)
        response.raise_for_status()
        keys = response.json()["keys"]

        # Decode the token header to get the kid
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header["kid"]

        # Find the public key from the JWKS
        public_keys = [key for key in keys if key["kid"] == kid]
        if not public_keys:
            return generate_policy("Deny", event["methodArn"])

        public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(public_keys[0]))

        # Verify the token
        decoded_token = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=cognito_client_id,  # Verify the audience
            issuer=f"https://cognito-idp.{region}.amazonaws.com/{user_pool_id}",  # Verify the issuer
        )
        add_connection(
            os.getenv("WS_CONNECTIONS_TABLE_NAME", ""),
            {
                "PK": event["requestContext"]["connectionId"],
                "connectionId": event["requestContext"]["connectionId"],
                "userId": decoded_token["sub"],
                "createdAt": int(event["requestContext"]["connectedAt"]),
            },
        )
        return generate_policy("Allow", event["methodArn"], decoded_token["sub"])
    except Exception:
        return generate_policy("Deny", event["methodArn"])


def generate_policy(effect: str, resource: str, principal_id: str = "*"):  # type: ignore
    return {
        "principalId": principal_id,
        "policyDocument": {
            "Version": "2012-10-17",
            "Statement": [{"Action": "execute-api:Invoke", "Effect": effect, "Resource": resource}],
        },
    }
