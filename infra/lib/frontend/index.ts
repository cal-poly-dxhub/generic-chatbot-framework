/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import * as cdk from 'aws-cdk-lib';
import * as cf from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { BaseInfra } from '../base-infra';

interface FrontendProps {
    baseInfra: BaseInfra;
    accessLogsBucket: s3.IBucket;
}

export class Frontend extends Construct {
    public readonly assetBucket: s3.IBucket;
    public readonly cloudFrontDistribution: cf.IDistribution;

    public constructor(scope: Construct, id: string, props: FrontendProps) {
        super(scope, id);

        const { accessLogsBucket } = props;

        const bucket = new s3.Bucket(this, 'FrontendAssetBucket', {
            serverAccessLogsBucket: accessLogsBucket,
            serverAccessLogsPrefix: 'website-access-logs',
            encryption: s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            enforceSSL: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });

        const distribution = new cf.Distribution(this, 'Distribution', {
            defaultRootObject: 'index.html',
            enableLogging: true,
            logBucket: accessLogsBucket,
            logFilePrefix: 'cloudfront-access-logs',
            defaultBehavior: {
                origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
                cachePolicy: cf.CachePolicy.CACHING_OPTIMIZED,
                responseHeadersPolicy:
                    cf.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_AND_SECURITY_HEADERS,
                viewerProtocolPolicy: cf.ViewerProtocolPolicy.HTTPS_ONLY,
            },
            webAclId: props.baseInfra.systemConfig.wafConfig?.cloudfrontWebAclArn,
            errorResponses: [
                // these ensure index.html will always be served for 403 and 404
                {
                    httpStatus: 403,
                    responseHttpStatus: 200,
                    ttl: cdk.Duration.seconds(0),
                    responsePagePath: '/index.html',
                },
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    ttl: cdk.Duration.seconds(0),
                    responsePagePath: '/index.html',
                },
            ],
            minimumProtocolVersion: cf.SecurityPolicyProtocol.TLS_V1_2_2021,
        });

        this.assetBucket = bucket;
        this.cloudFrontDistribution = distribution;
    }
}
