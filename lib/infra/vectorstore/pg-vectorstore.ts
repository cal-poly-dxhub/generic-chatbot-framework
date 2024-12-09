/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
*/
import { Construct } from 'constructs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as constants from '../common/constants';
import * as path from 'path';

import { CustomResource } from 'aws-cdk-lib';
import { BaseInfra } from '../base-infra';

export interface PgVectorStoreProps {
    readonly baseInfra: BaseInfra;
}

export class PgVectorStore extends Construct {
    public readonly cluster: rds.DatabaseCluster;
    public readonly rdsProxy?: rds.IDatabaseProxy;
    public readonly secret: secretsmanager.ISecret;

    public constructor(scope: Construct, id: string, props: PgVectorStoreProps) {
        super(scope, id);

        const securityGroup = new ec2.SecurityGroup(this, 'rds-security-group', {
            vpc: props.baseInfra.vpc,
            description: 'RDS Postgres security group',
        });
        securityGroup.addIngressRule(
            ec2.Peer.ipv4(props.baseInfra.vpc.vpcCidrBlock),
            ec2.Port.tcp(5432),
            'Allow VPC resources access'
        );

        const vectorStoreConfig =
            props.baseInfra.systemConfig.ragConfig.vectorStoreConfig;

        this.cluster = new rds.DatabaseCluster(this, 'rds-cluster', {
            engine: rds.DatabaseClusterEngine.auroraPostgres({
                version: rds.AuroraPostgresEngineVersion.VER_15_3,
            }),
            vpc: props.baseInfra.vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
            },
            securityGroups: [securityGroup],
            defaultDatabaseName: constants.PGVECTOR_DATABASE_NAME,
            removalPolicy: props.baseInfra.removalPolicy,
            serverlessV2MinCapacity: vectorStoreConfig.vectorStoreProperties?.minCapacity,
            serverlessV2MaxCapacity: vectorStoreConfig.vectorStoreProperties?.maxCapacity,
            writer: rds.ClusterInstance.serverlessV2('writer', {
                autoMinorVersionUpgrade: false,
            }),
            storageEncrypted: true,
            iamAuthentication: true,
        });

        if (vectorStoreConfig.vectorStoreProperties?.useRDSProxy) {
            this.rdsProxy = this.cluster.addProxy('rds-proxy', {
                vpc: props.baseInfra.vpc,
                vpcSubnets: {
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                },
                secrets: [this.cluster.secret!],
                securityGroups: [securityGroup],
                // TODO: add support for TLS
                requireTLS: false,
            });
        }

        this.secret = this.cluster.secret!;

        this.cluster.connections.allowFrom(
            ec2.Peer.ipv4(props.baseInfra.vpc.vpcCidrBlock),
            ec2.Port.tcp(this.cluster.clusterEndpoint.port)
        );

        const setupHandler = new lambda.Function(this, 'rds-setup-handler', {
            ...constants.LAMBDA_COMMON_PROPERTIES,
            vpc: props.baseInfra.vpc,
            runtime: constants.LAMBDA_PYTHON_RUNTIME,
            memorySize: 256,
            code: lambda.Code.fromAsset(
                path.join(constants.BACKEND_DIR, 'custom-resources', 'setup-pgvector')
            ),
            handler: 'lambda.handler',
            layers: [
                props.baseInfra.powerToolsLayer,
                props.baseInfra.langchainLayer,
                props.baseInfra.toolkitLayer,
            ],
            environment: {
                ...constants.LAMBDA_COMMON_ENVIRONMENT,

                /* eslint-disable @typescript-eslint/naming-convention */
                POWERTOOLS_SERVICE_NAME: 'rds-setup-handler',
                EMBEDDINGS_SAGEMAKER_MODELS: JSON.stringify(
                    props.baseInfra.systemConfig.ragConfig.embeddingsModels
                ),
                RDS_SECRET_ARN: this.cluster.secret!.secretArn,
                RDS_ENDPOINT: this.rdsEndpoint,
                /* eslint-enable @typescript-eslint/naming-convention */
            },
        });
        this.cluster.secret!.grantRead(setupHandler);

        const cr = new CustomResource(this, 'cr-rds-setup', {
            serviceToken: setupHandler.functionArn,
            resourceType: 'Custom::SetupVectorStore',
            properties: {
                embeddingModels: JSON.stringify(
                    props.baseInfra.systemConfig.ragConfig.embeddingsModels
                ),
            },
        });
        cr.node.addDependency(this.cluster);
    }

    public get rdsEndpoint(): string {
        return this.rdsProxy
            ? this.rdsProxy.endpoint
            : this.cluster.clusterEndpoint.hostname;
    }
}
