/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
*/
import { Stack } from 'aws-cdk-lib';
import { NagSuppressions } from 'cdk-nag';

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

    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        `/${stack.stackName}/BaseInfra/Vpc/SageMakerRuntimeEndpoint/SecurityGroup/Resource`,
        [
            {
                id: 'AwsSolutions-EC23',
                reason: 'Internal security group for VPC endpoints managed by CDK library',
            },
        ]
    );
    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        `/${stack.stackName}/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1024MiB`,
        [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'CDK deployment resources are managed by CDK',
            },
            {
                id: 'AwsSolutions-IAM4',
                reason: 'CDK deployment resources are managed by CDK, it uses AWSLambdaBasicExecutionRole managed policy',
            },
            {
                id: 'AwsSolutions-L1',
                reason: "CDK deployment resources are managed by CDK, can't control the runtime version",
            },
        ],
        true
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
};
