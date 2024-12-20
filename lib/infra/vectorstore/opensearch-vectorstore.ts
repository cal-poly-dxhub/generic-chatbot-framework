/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
*/
/* eslint-disable @typescript-eslint/naming-convention */
import * as aoss from 'aws-cdk-lib/aws-opensearchserverless';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as constants from '../common/constants';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { BaseInfra } from '../base-infra';
import * as path from 'path';
import { CustomResource } from 'aws-cdk-lib';
import { NagSuppressions } from 'cdk-nag';
import { OpenSearchVectorStoreConfig } from '../common/types';

export interface OpenSearchVectorStoreProps {
    readonly baseInfra: BaseInfra;
    readonly dataAccessRoles: iam.IRole[];
}

export class OpenSearchVectorStore extends Construct {
    public readonly collection: aoss.CfnCollection;
    public readonly opensearchSetupHandler: CustomResource;

    public constructor(scope: Construct, id: string, props: OpenSearchVectorStoreProps) {
        super(scope, id);

        const applicationName = props.baseInfra.systemConfig.applicationName ?? 'default';
        const collectionName = `fr-col-${applicationName}`;

        const indexCreatorRole = new iam.Role(this, 'IndexCreatorRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName(
                    'service-role/AWSLambdaBasicExecutionRole'
                ),
                iam.ManagedPolicy.fromAwsManagedPolicyName(
                    'service-role/AWSLambdaVPCAccessExecutionRole'
                ),
            ],
        });

        const vectorStoreConfig = props.baseInfra.systemConfig.ragConfig
            .vectorStoreConfig as OpenSearchVectorStoreConfig;

        // Create the vector search collection
        this.collection = new aoss.CfnCollection(this, 'VectorCollection', {
            name: collectionName,
            description: 'Vector search collection for storing embeddings',
            type: 'VECTORSEARCH',
            standbyReplicas:
                vectorStoreConfig.vectorStoreProperties?.standbyReplicas || 'ENABLED',
        });

        // Create encryption policy
        const encryptionPolicy = new aoss.CfnSecurityPolicy(this, 'EncryptionPolicy', {
            name: `${collectionName}-enc-pl`,
            type: 'encryption',
            description: 'Encryption policy for vector search collection',
            policy: JSON.stringify({
                Rules: [
                    {
                        ResourceType: 'collection',
                        Resource: [`collection/${collectionName}`],
                    },
                ],
                AWSOwnedKey: true,
            }),
        });

        const allowFromPublic =
            vectorStoreConfig.vectorStoreProperties?.allowFromPublic ?? false;

        const vpceSecurityGroup = new ec2.SecurityGroup(
            this,
            'VpcEndpointSecurityGroup',
            {
                vpc: props.baseInfra.vpc,
                allowAllOutbound: true,
            }
        );
        vpceSecurityGroup.addIngressRule(
            ec2.Peer.ipv4(props.baseInfra.vpc.vpcCidrBlock),
            ec2.Port.allTcp(),
            'Allow all TCP traffic from VPC'
        );
        const vpcEndpoint = new aoss.CfnVpcEndpoint(this, 'VpcEndpoint', {
            name: `${collectionName}-vpce`,
            subnetIds: props.baseInfra.vpc.selectSubnets({
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            }).subnetIds,
            vpcId: props.baseInfra.vpc.vpcId,
            securityGroupIds: [vpceSecurityGroup.securityGroupId],
        });

        // Create network policy (defaults to public access)
        const networkPolicy = new aoss.CfnSecurityPolicy(this, 'NetworkPolicy', {
            name: `${collectionName}-net-pl`,
            type: 'network',
            description: 'Network policy for vector search collection',
            policy: JSON.stringify([
                {
                    Rules: [
                        {
                            ResourceType: 'collection',
                            Resource: [`collection/${collectionName}`],
                        },
                    ],
                    AllowFromPublic: allowFromPublic,
                    ...(allowFromPublic
                        ? {}
                        : {
                              SourceVPCEs: [vpcEndpoint.attrId],
                              SourceServices: ['bedrock.amazonaws.com'],
                          }),
                },
            ]),
        });

        // Create data access policy
        const dataAccessPolicy = new aoss.CfnAccessPolicy(this, 'DataAccessPolicy', {
            name: `${collectionName}-acc-pl`,
            type: 'data',
            description: 'Data access policy for vector search collection',
            policy: JSON.stringify([
                {
                    Rules: [
                        {
                            ResourceType: 'collection',
                            Resource: [`collection/${collectionName}`],
                            Permission: [
                                'aoss:CreateCollectionItems',
                                'aoss:DeleteCollectionItems',
                                'aoss:UpdateCollectionItems',
                                'aoss:DescribeCollectionItems',
                            ],
                        },
                        {
                            Resource: [`index/${collectionName}/*`],
                            Permission: [
                                'aoss:CreateIndex',
                                'aoss:DeleteIndex',
                                'aoss:UpdateIndex',
                                'aoss:DescribeIndex',
                                'aoss:ReadDocument',
                                'aoss:WriteDocument',
                            ],
                            ResourceType: 'index',
                        },
                    ],
                    Principal: [
                        ...props.dataAccessRoles.map((role) => role.roleArn),
                        indexCreatorRole.roleArn,
                    ],
                },
            ]),
        });

        // Add dependencies
        networkPolicy.addDependency(vpcEndpoint);
        this.collection.addDependency(encryptionPolicy);
        this.collection.addDependency(networkPolicy);
        this.collection.addDependency(dataAccessPolicy);

        // Add permissions to interact with OpenSearch Serverless
        indexCreatorRole.addToPolicy(
            new iam.PolicyStatement({
                actions: [
                    'aoss:APIAccessAll',
                    'aoss:List*',
                    'aoss:Get*',
                    'aoss:Create*',
                    'aoss:Update*',
                ],
                resources: [this.collection.attrArn],
            })
        );
        NagSuppressions.addResourceSuppressions(
            indexCreatorRole,
            [
                {
                    id: 'AwsSolutions-IAM4',
                    reason: 'The only managed policy that is used is the AWSLambdaBasicExecutionRole which is provided by default by CDK',
                },
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The wildcard permissions are used to grant necessary permissions to the custom resource',
                },
            ],
            true
        );

        // Create a custom resource to initialize the index
        const setupHandler = new lambda.Function(this, 'opensearch-setup-handler', {
            ...constants.LAMBDA_COMMON_PROPERTIES,
            vpc: props.baseInfra.vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            role: indexCreatorRole,
            code: lambda.Code.fromAsset(
                path.join(constants.BACKEND_DIR, 'custom-resources', 'setup-opensearch')
            ),
            handler: 'lambda.handler',
            layers: [props.baseInfra.powerToolsLayer, props.baseInfra.langchainLayer],
            environment: {
                ...constants.LAMBDA_COMMON_ENVIRONMENT,
                POWERTOOLS_SERVICE_NAME: 'opensearch-setup-handler',
            },
        });

        const cr = new CustomResource(this, 'cr-opensearch-setup', {
            serviceToken: setupHandler.functionArn,
            resourceType: 'Custom::SetupOpenSearch',
            properties: {
                CollectionEndpoint: this.collection.attrCollectionEndpoint,
                IndexName: `fr-idx-${applicationName}`,
                VectorDimensions:
                    props.baseInfra.systemConfig.ragConfig.embeddingsModels[0].dimensions,
            },
        });
        cr.node.addDependency(this.collection);
        this.opensearchSetupHandler = cr;

        NagSuppressions.addResourceSuppressions(
            [setupHandler],
            [
                {
                    id: 'AwsSolutions-L1',
                    reason: 'The selected runtime version, Python 3.11, has been intentionally chosen to align with specific project requirements',
                },
            ],
            true
        );
    }
}
