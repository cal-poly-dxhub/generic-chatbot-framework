/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
*/
/* eslint-disable @typescript-eslint/naming-convention */
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import path = require('path');

export const PGVECTOR_DATABASE_NAME = 'embeddings';

export const CONVERSATION_STORE_GSI_INDEX_NAME = 'GSI1';

export const METRICS_NAMESPACE = 'AWSPrototyping/Francis';

export const LAMBDA_NODEJS_RUNTIME = lambda.Runtime.NODEJS_18_X;

export const LAMBDA_PYTHON_RUNTIME = lambda.Runtime.PYTHON_3_11;

export const LAMBDA_ARCHITECTURE = lambda.Architecture.ARM_64;

export const LAMBDA_POWERTOOLS_LAYER_VERSION = '5';

export const LAMBDA_POWERTOOLS_PYTHON_VERSION = 'python311';

export const CHUNK_SIZE_DOC_SPLIT = '1000';

export const OVERLAP_FOR_DOC_SPLIT = '200';

export const INGESTION_LAMBDA_MEMORY_SIZE = 1024;

export const COGNITO_ADMIN_GROUP_NAME = 'Administrators';

export const LAMBDA_COMMON_PROPERTIES = {
    architecture: LAMBDA_ARCHITECTURE,
    runtime: LAMBDA_PYTHON_RUNTIME,
    memorySize: 256,
    timeout: cdk.Duration.minutes(5),
    tracing: lambda.Tracing.ACTIVE,
    vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    logRetention: logs.RetentionDays.ONE_WEEK,
};

export const LAMBDA_COMMON_ENVIRONMENT = {
    POWERTOOLS_DEV: 'false',
    LOG_LEVEL: 'INFO',
    POWERTOOLS_LOGGER_LOG_EVENT: 'true',
};

export const BUCKET_COMMON_PROPERTIES = {
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    versioned: true,
    enforceSSL: true,
    encryption: s3.BucketEncryption.S3_MANAGED,
};

export const BACKEND_DIR = path.join(__dirname, '../../backend');
