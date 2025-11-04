/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
*/
import { Stack } from 'aws-cdk-lib';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export const applyNagSuppressions = (stack: Stack): void => {
    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        `/${stack.stackName}/BaseInfra/Vpc/S3InterfaceEndpoint/SecurityGroup/Resource`,
        [
            {
                id: 'AwsSolutions-EC23',
                reason: 'Internal security group for VPC endpoints managed by CDK',
            },
        ]
    );

    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        `/${stack.stackName}/BaseInfra/Vpc/SecretsManagerEndpoint/SecurityGroup/Resource`,
        [
            {
                id: 'AwsSolutions-EC23',
                reason: 'Internal security group for VPC endpoints managed by CDK',
            },
        ]
    );

    [
        'Api/WebSocket/WsAuthorizerHandler/ServiceRole/Resource',
        'Api/WebSocket/WsApiHandler/ServiceRole/Resource',
        'Api/conversationApiHandler/ServiceRole/Resource',
        'Api/corpusApiHandler/ServiceRole/Resource',
        'Api/inferenceApiHandler/ServiceRole/Resource',
        'Api/inferenceApiHandler/ServiceRole/DefaultPolicy/Resource',
        'Api/WebSocket/WsApiHandler/ServiceRole/DefaultPolicy/Resource',
        'Api/WebSocket/WsAuthorizerHandler/ServiceRole/DefaultPolicy/Resource',
        'Api/ApiAuthenticatedRolePolicy/Resource',
        'Api/conversationApiHandler/ServiceRole/DefaultPolicy/Resource',
        'Api/RestApi/CloudWatchRole/Resource',
        'Authentication/UserPool/smsRole/Resource',
        'Api/corpusApiHandler/ServiceRole/DefaultPolicy/Resource',
        'LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8a/ServiceRole/DefaultPolicy/Resource',
        'LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8a/ServiceRole/Resource',
        'BaseInfra/ConfigTableCustomResource/CustomResourcePolicy/Resource',
        'AWS679f53fac002430cb0da5b7982bd2287/ServiceRole/Resource',
    ].forEach((p) => {
        NagSuppressions.addResourceSuppressionsByPath(stack, `${stack.stackName}/${p}`, [
            {
                id: 'AwsSolutions-IAM4',
                reason: 'The only managed policy that is used is the AWSLambdaBasicExecutionRole which is provided by default by CDK',
            },
            {
                id: 'AwsSolutions-IAM5',
                reason: 'CDK deployment resources are managed by CDK',
            },
        ]);
    });

    [
        'Api/WebSocket/WsAuthorizerHandler/Resource',
        'Api/WebSocket/WsApiHandler/Resource',
        'Api/conversationApiHandler/Resource',
        'Api/corpusApiHandler/Resource',
        'Api/inferenceApiHandler/Resource',
    ].forEach((p) => {
        NagSuppressions.addResourceSuppressionsByPath(stack, `${stack.stackName}/${p}`, [
            {
                id: 'AwsSolutions-L1',
                reason: 'The selected runtime version, Python 3.11, has been intentionally chosen to align with specific project requirements',
            },
        ]);
    });

    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        `/${stack.stackName}/Api/RestApi/Default`,
        [
            {
                id: 'AwsSolutions-COG4',
                reason: 'The selected IAM authentication is used to secure the API endpoints',
            },
            {
                id: 'AwsSolutions-APIG4',
                reason: 'The selected IAM authentication is used to secure the API endpoints',
            },
        ],
        true
    );

    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        `/${stack.stackName}/Api/WebSocket/WsApi`,
        [
            {
                id: 'AwsSolutions-APIG4',
                reason: '$connect route has been secured, You can specify authorization settings only for the $connect route',
            },
        ],
        true
    );

    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        `/${stack.stackName}/Api/RestApi/Resource`,
        [
            {
                id: 'AwsSolutions-APIG2',
                reason: 'Request validation is implemented by the individual lambdas',
            },
        ]
    );

    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        `/${stack.stackName}/Frontend/Distribution/Resource`,
        [
            {
                id: 'AwsSolutions-CFR4',
                reason: 'The SSL cert is managed by the consumer',
            },
        ]
    );

    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        `/${stack.stackName}/Api/WebSocket/ProdStage/Resource`,
        [
            {
                id: 'AwsSolutions-APIG1',
                reason: 'Enabling access log using CDK is not supported as of now (https://github.com/aws/aws-cdk/discussions/25474)',
            },
        ]
    );

    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        `/${stack.stackName}/Api/RestApi/DeploymentStage.prod/Resource`,
        [
            {
                id: 'AwsSolutions-APIG6',
                reason: 'Enabling access log using CDK is not supported as of now (https://github.com/aws/aws-cdk/discussions/25474)',
            },
            {
                id: 'AwsSolutions-APIG3',
                reason: 'Association with AWS WAFv2 is optional; customers may attach their own WebACL.',
            },
        ]
    );

    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        `/${stack.stackName}/Frontend/Distribution/Resource`,
        [
            {
                id: 'AwsSolutions-CFR1',
                reason: 'This is subject to customer using geo specific restriction.',
            },
            {
                id: 'AwsSolutions-CFR2',
                reason: 'The solution supports importing existing WAF for CloudFront distribution',
            },
        ]
    );

    NagSuppressions.addStackSuppressions(stack, [
        {
            id: 'CdkNagValidationFailure',
            reason: 'Intrinstic function references.',
        },
    ]);

    // Suppressions for cdk-s3-vectors custom resources and roles (third-party library constructs)
    [
        // Vector bucket handlers and provider framework
        'S3VectorStore/VectorBucket/S3VectorsBucketHandler/ServiceRole/Resource',
        'S3VectorStore/VectorBucket/S3VectorsBucketHandler/ServiceRole/DefaultPolicy/Resource',
        'S3VectorStore/VectorBucket/S3VectorsProvider/framework-onEvent/ServiceRole/Resource',
        'S3VectorStore/VectorBucket/S3VectorsProvider/framework-onEvent/ServiceRole/DefaultPolicy/Resource',
        // Vector index handlers and provider framework (V3 - without metadata config)
        'S3VectorStore/VectorIndexV3/S3VectorsHandler/ServiceRole/Resource',
        'S3VectorStore/VectorIndexV3/S3VectorsHandler/ServiceRole/DefaultPolicy/Resource',
        'S3VectorStore/VectorIndexV3/S3VectorsProvider/framework-onEvent/ServiceRole/Resource',
        'S3VectorStore/VectorIndexV3/S3VectorsProvider/framework-onEvent/ServiceRole/DefaultPolicy/Resource',
        // Vector index handlers and provider framework (V3 - with metadata config)
        'S3VectorStore/VectorIndexWithMetadataConfigV3/S3VectorsHandler/ServiceRole/Resource',
        'S3VectorStore/VectorIndexWithMetadataConfigV3/S3VectorsHandler/ServiceRole/DefaultPolicy/Resource',
        'S3VectorStore/VectorIndexWithMetadataConfigV3/S3VectorsProvider/framework-onEvent/ServiceRole/Resource',
        'S3VectorStore/VectorIndexWithMetadataConfigV3/S3VectorsProvider/framework-onEvent/ServiceRole/DefaultPolicy/Resource',
        // Knowledge base handlers and provider framework (V3 - without metadata config)
        'S3VectorStore/KnowledgeBaseV3/BedrockKBHandler/ServiceRole/Resource',
        'S3VectorStore/KnowledgeBaseV3/BedrockKBHandler/ServiceRole/DefaultPolicy/Resource',
        'S3VectorStore/KnowledgeBaseV3/BedrockKBProvider/framework-onEvent/ServiceRole/Resource',
        'S3VectorStore/KnowledgeBaseV3/BedrockKBProvider/framework-onEvent/ServiceRole/DefaultPolicy/Resource',
        // Knowledge base handlers and provider framework (V3 - with metadata config)
        'S3VectorStore/KnowledgeBaseWithMetadataConfigV3/BedrockKBHandler/ServiceRole/Resource',
        'S3VectorStore/KnowledgeBaseWithMetadataConfigV3/BedrockKBHandler/ServiceRole/DefaultPolicy/Resource',
        'S3VectorStore/KnowledgeBaseWithMetadataConfigV3/BedrockKBProvider/framework-onEvent/ServiceRole/Resource',
        'S3VectorStore/KnowledgeBaseWithMetadataConfigV3/BedrockKBProvider/framework-onEvent/ServiceRole/DefaultPolicy/Resource',
        // Knowledge base role default policy generated by library (V3 - without metadata config)
        'S3VectorStore/KnowledgeBaseV3/BedrockKnowledgeBaseRole/DefaultPolicy/Resource',
        // Knowledge base role default policy generated by library (V3 - with metadata config)
        'S3VectorStore/KnowledgeBaseWithMetadataConfigV3/BedrockKnowledgeBaseRole/DefaultPolicy/Resource',
        // Vector index handlers and provider framework (V4 - without metadata config)
        'S3VectorStore/VectorIndexV4/S3VectorsHandler/ServiceRole/Resource',
        'S3VectorStore/VectorIndexV4/S3VectorsHandler/ServiceRole/DefaultPolicy/Resource',
        'S3VectorStore/VectorIndexV4/S3VectorsProvider/framework-onEvent/ServiceRole/Resource',
        'S3VectorStore/VectorIndexV4/S3VectorsProvider/framework-onEvent/ServiceRole/DefaultPolicy/Resource',
        // Vector index handlers and provider framework (V4 - with metadata config)
        'S3VectorStore/VectorIndexWithMetadataConfigV4/S3VectorsHandler/ServiceRole/Resource',
        'S3VectorStore/VectorIndexWithMetadataConfigV4/S3VectorsHandler/ServiceRole/DefaultPolicy/Resource',
        'S3VectorStore/VectorIndexWithMetadataConfigV4/S3VectorsProvider/framework-onEvent/ServiceRole/Resource',
        'S3VectorStore/VectorIndexWithMetadataConfigV4/S3VectorsProvider/framework-onEvent/ServiceRole/DefaultPolicy/Resource',
        // Knowledge base handlers and provider framework (V4 - without metadata config)
        'S3VectorStore/KnowledgeBaseV4/BedrockKBHandler/ServiceRole/Resource',
        'S3VectorStore/KnowledgeBaseV4/BedrockKBHandler/ServiceRole/DefaultPolicy/Resource',
        'S3VectorStore/KnowledgeBaseV4/BedrockKBProvider/framework-onEvent/ServiceRole/Resource',
        'S3VectorStore/KnowledgeBaseV4/BedrockKBProvider/framework-onEvent/ServiceRole/DefaultPolicy/Resource',
        // Knowledge base handlers and provider framework (V4 - with metadata config)
        'S3VectorStore/KnowledgeBaseWithMetadataConfigV4/BedrockKBHandler/ServiceRole/Resource',
        'S3VectorStore/KnowledgeBaseWithMetadataConfigV4/BedrockKBHandler/ServiceRole/DefaultPolicy/Resource',
        'S3VectorStore/KnowledgeBaseWithMetadataConfigV4/BedrockKBProvider/framework-onEvent/ServiceRole/Resource',
        'S3VectorStore/KnowledgeBaseWithMetadataConfigV4/BedrockKBProvider/framework-onEvent/ServiceRole/DefaultPolicy/Resource',
        // Knowledge base role default policy generated by library (V4 - without metadata config)
        'S3VectorStore/KnowledgeBaseV4/BedrockKnowledgeBaseRole/DefaultPolicy/Resource',
        // Knowledge base role default policy generated by library (V4 - with metadata config)
        'S3VectorStore/KnowledgeBaseWithMetadataConfigV4/BedrockKnowledgeBaseRole/DefaultPolicy/Resource',
        // Vector index handlers and provider framework (V5 - without metadata config)
        'S3VectorStore/VectorIndexV5/S3VectorsHandler/ServiceRole/Resource',
        'S3VectorStore/VectorIndexV5/S3VectorsHandler/ServiceRole/DefaultPolicy/Resource',
        'S3VectorStore/VectorIndexV5/S3VectorsProvider/framework-onEvent/ServiceRole/Resource',
        'S3VectorStore/VectorIndexV5/S3VectorsProvider/framework-onEvent/ServiceRole/DefaultPolicy/Resource',
        // Vector index handlers and provider framework (V5 - with metadata config)
        'S3VectorStore/VectorIndexWithMetadataConfigV5/S3VectorsHandler/ServiceRole/Resource',
        'S3VectorStore/VectorIndexWithMetadataConfigV5/S3VectorsHandler/ServiceRole/DefaultPolicy/Resource',
        'S3VectorStore/VectorIndexWithMetadataConfigV5/S3VectorsProvider/framework-onEvent/ServiceRole/Resource',
        'S3VectorStore/VectorIndexWithMetadataConfigV5/S3VectorsProvider/framework-onEvent/ServiceRole/DefaultPolicy/Resource',
        // Knowledge base handlers and provider framework (V5 - without metadata config)
        'S3VectorStore/KnowledgeBaseV5/BedrockKBHandler/ServiceRole/Resource',
        'S3VectorStore/KnowledgeBaseV5/BedrockKBHandler/ServiceRole/DefaultPolicy/Resource',
        'S3VectorStore/KnowledgeBaseV5/BedrockKBProvider/framework-onEvent/ServiceRole/Resource',
        'S3VectorStore/KnowledgeBaseV5/BedrockKBProvider/framework-onEvent/ServiceRole/DefaultPolicy/Resource',
        // Knowledge base handlers and provider framework (V5 - with metadata config)
        'S3VectorStore/KnowledgeBaseWithMetadataConfigV5/BedrockKBHandler/ServiceRole/Resource',
        'S3VectorStore/KnowledgeBaseWithMetadataConfigV5/BedrockKBHandler/ServiceRole/DefaultPolicy/Resource',
        'S3VectorStore/KnowledgeBaseWithMetadataConfigV5/BedrockKBProvider/framework-onEvent/ServiceRole/Resource',
        'S3VectorStore/KnowledgeBaseWithMetadataConfigV5/BedrockKBProvider/framework-onEvent/ServiceRole/DefaultPolicy/Resource',
        // Knowledge base role default policy generated by library (V5 - without metadata config)
        'S3VectorStore/KnowledgeBaseV5/BedrockKnowledgeBaseRole/DefaultPolicy/Resource',
        // Knowledge base role default policy generated by library (V5 - with metadata config)
        'S3VectorStore/KnowledgeBaseWithMetadataConfigV5/BedrockKnowledgeBaseRole/DefaultPolicy/Resource',
        // Vector index handlers and provider framework (V6 - without metadata config)
        'S3VectorStore/VectorIndexV6/S3VectorsHandler/ServiceRole/Resource',
        'S3VectorStore/VectorIndexV6/S3VectorsHandler/ServiceRole/DefaultPolicy/Resource',
        'S3VectorStore/VectorIndexV6/S3VectorsProvider/framework-onEvent/ServiceRole/Resource',
        'S3VectorStore/VectorIndexV6/S3VectorsProvider/framework-onEvent/ServiceRole/DefaultPolicy/Resource',
        // Vector index handlers and provider framework (V6 - with metadata config)
        'S3VectorStore/VectorIndexWithMetadataConfigV6/S3VectorsHandler/ServiceRole/Resource',
        'S3VectorStore/VectorIndexWithMetadataConfigV6/S3VectorsHandler/ServiceRole/DefaultPolicy/Resource',
        'S3VectorStore/VectorIndexWithMetadataConfigV6/S3VectorsProvider/framework-onEvent/ServiceRole/Resource',
        'S3VectorStore/VectorIndexWithMetadataConfigV6/S3VectorsProvider/framework-onEvent/ServiceRole/DefaultPolicy/Resource',
        // Knowledge base handlers and provider framework (V6 - without metadata config)
        'S3VectorStore/KnowledgeBaseV6/BedrockKBHandler/ServiceRole/Resource',
        'S3VectorStore/KnowledgeBaseV6/BedrockKBHandler/ServiceRole/DefaultPolicy/Resource',
        'S3VectorStore/KnowledgeBaseV6/BedrockKBProvider/framework-onEvent/ServiceRole/Resource',
        'S3VectorStore/KnowledgeBaseV6/BedrockKBProvider/framework-onEvent/ServiceRole/DefaultPolicy/Resource',
        // Knowledge base handlers and provider framework (V6 - with metadata config)
        'S3VectorStore/KnowledgeBaseWithMetadataConfigV6/BedrockKBHandler/ServiceRole/Resource',
        'S3VectorStore/KnowledgeBaseWithMetadataConfigV6/BedrockKBHandler/ServiceRole/DefaultPolicy/Resource',
        'S3VectorStore/KnowledgeBaseWithMetadataConfigV6/BedrockKBProvider/framework-onEvent/ServiceRole/Resource',
        'S3VectorStore/KnowledgeBaseWithMetadataConfigV6/BedrockKBProvider/framework-onEvent/ServiceRole/DefaultPolicy/Resource',
        // Knowledge base role default policy generated by library (V6 - without metadata config)
        'S3VectorStore/KnowledgeBaseV6/BedrockKnowledgeBaseRole/DefaultPolicy/Resource',
        // Knowledge base role default policy generated by library (V6 - with metadata config)
        'S3VectorStore/KnowledgeBaseWithMetadataConfigV6/BedrockKnowledgeBaseRole/DefaultPolicy/Resource',
    ].forEach((p) => {
        try {
            NagSuppressions.addResourceSuppressionsByPath(
                stack,
                `/${stack.stackName}/${p}`,
                [
                    {
                        id: 'AwsSolutions-IAM4',
                        reason: 'cdk-s3-vectors custom resources use AWSLambdaBasicExecutionRole managed policy as part of the provider runtime.',
                    },
                    {
                        id: 'AwsSolutions-IAM5',
                        reason: 'cdk-s3-vectors and Bedrock KB integrations require wildcard permissions to manage dynamically named resources.',
                    },
                ]
            );
        } catch (error) {
            // Suppress errors for paths that don't exist - only one construct ID variant exists
            // based on whether metadata config is present
        }
    });

    // Suppressions for BucketDeployment custom resources
    // The custom resource ID is dynamically hashed based on configuration (memory, storage, etc.)
    // The custom resource appears directly under the stack, not under FrontendDeployment
    // We need to find all constructs with Custom::CDKBucketDeployment in their path
    const findAllResources = (
        construct: Construct,
        results: Construct[] = []
    ): Construct[] => {
        // Check if this construct's node path contains the custom resource pattern
        const nodePath = construct.node.path;
        if (nodePath.includes('Custom::CDKBucketDeployment')) {
            results.push(construct);
        }
        // Recursively search children
        for (const child of construct.node.children) {
            findAllResources(child, results);
        }
        return results;
    };

    const bucketDeploymentResources = findAllResources(stack);
    bucketDeploymentResources.forEach((resource) => {
        // Suppress on the custom resource and all its children (ServiceRole, DefaultPolicy, etc.)
        NagSuppressions.addResourceSuppressions(
            resource,
            [
                {
                    id: 'AwsSolutions-IAM4',
                    reason: 'BucketDeployment custom resources use AWSLambdaBasicExecutionRole managed policy which is provided by CDK.',
                },
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'BucketDeployment requires wildcard permissions to manage S3 assets and CDK asset buckets.',
                },
            ],
            true // applyToChildren
        );
    });
};
