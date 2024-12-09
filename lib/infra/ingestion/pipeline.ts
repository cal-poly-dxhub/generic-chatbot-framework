/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
*/

import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as stepfn from 'aws-cdk-lib/aws-stepfunctions';
import * as stepfn_task from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as constants from '../common/constants';
import { BaseInfra } from '../base-infra';
import { Construct } from 'constructs';

export interface IngestionPipelineProps {
    readonly baseInfra: BaseInfra;
    readonly rdsSecret: secretsmanager.ISecret;
    readonly rdsEndpoint: string;
    readonly inferenceLambda: lambda.IFunction;
}

export class IngestionPipeline extends Construct {
    public readonly inputAssetsBucket: s3.Bucket;

    public readonly ingestionStateMachine: stepfn.StateMachine;

    public readonly embeddingsFunction: lambda.IFunction;
    public readonly inputValidationFunction: lambda.IFunction;

    public constructor(scope: Construct, id: string, props: IngestionPipelineProps) {
        super(scope, id);

        const startState = {
            /* eslint-disable @typescript-eslint/naming-convention */
            ['StateMachine.$' as 'StateMachine']: '$$.StateMachine' as unknown,
            ['Execution.$' as 'Execution']: '$$.Execution' as unknown,
            /* eslint-enable @typescript-eslint/naming-convention */
        };

        const cacheTable = new ddb.Table(this, 'CacheTable', {
            partitionKey: {
                name: 'PK',
                type: ddb.AttributeType.STRING,
            },
            sortKey: {
                name: 'SK',
                type: ddb.AttributeType.STRING,
            },
            billingMode: ddb.BillingMode.PAY_PER_REQUEST,
            encryption: ddb.TableEncryption.AWS_MANAGED,
            removalPolicy: props.baseInfra.removalPolicy,
            pointInTimeRecovery: true,
        });

        cacheTable.addGlobalSecondaryIndex({
            indexName: 'GSI1',
            partitionKey: {
                name: 'UpdatedStatus',
                type: ddb.AttributeType.STRING,
            },
            sortKey: {
                name: 'FileURI',
                type: ddb.AttributeType.STRING,
            },
        });

        const ingestionLambdaCommonProps = {
            ...constants.LAMBDA_COMMON_PROPERTIES,
            vpc: props.baseInfra.vpc,
            runtime: constants.LAMBDA_PYTHON_RUNTIME,
            memorySize: constants.INGESTION_LAMBDA_MEMORY_SIZE,
            handler: 'lambda.handler',
            timeout: cdk.Duration.minutes(15),
            layers: [
                props.baseInfra.powerToolsLayer,
                props.baseInfra.langchainLayer,
                props.baseInfra.toolkitLayer,
            ],
        };

        const cacheUpdateLambda = new lambda.Function(this, 'cacheUpdateFunction', {
            ...ingestionLambdaCommonProps,
            code: lambda.Code.fromAsset(
                path.join(constants.BACKEND_DIR, 'ingestion', 'cache_update')
            ),
            environment: {
                ...constants.LAMBDA_COMMON_ENVIRONMENT,
                /* eslint-disable @typescript-eslint/naming-convention */
                CACHE_TABLE_NAME: cacheTable.tableName,
                POWERTOOLS_SERVICE_NAME: 'ingestion-input-validation',
                /* eslint-enable @typescript-eslint/naming-convention */
            },
        });
        cacheTable.grantReadWriteData(cacheUpdateLambda);

        // Bucket containing the inputs assets (documents - multiple modalities) uploaded by the user
        const inputAssetsBucket = new s3.Bucket(this, 'inputAssetsBucket', {
            ...constants.BUCKET_COMMON_PROPERTIES,
            serverAccessLogsBucket: props.baseInfra.serverAccessLogsBucket,
        });
        inputAssetsBucket.grantRead(cacheUpdateLambda);
        inputAssetsBucket.grantRead(props.inferenceLambda);
        inputAssetsBucket.addEventNotification(
            s3.EventType.OBJECT_CREATED,
            new s3n.LambdaDestination(cacheUpdateLambda)
        );
        cacheTable.grantWriteData(cacheUpdateLambda);
        this.inputAssetsBucket = inputAssetsBucket;

        // Bucket containing the processed assets (documents - text format) uploaded by the user
        const processedAssetsBucket = new s3.Bucket(this, 'processedAssetsBucket', {
            ...constants.BUCKET_COMMON_PROPERTIES,
            serverAccessLogsBucket: props.baseInfra.serverAccessLogsBucket,
        });

        const ingestionLambdaCommonEnvironment = {
            /* eslint-disable @typescript-eslint/naming-convention */
            METRICS_NAMESPACE: constants.METRICS_NAMESPACE,
            CACHE_TABLE_NAME: cacheTable.tableName,
            EMBEDDINGS_SAGEMAKER_MODELS: JSON.stringify(
                props.baseInfra.systemConfig.ragConfig.embeddingsModels
            ),
            PROCESSED_BUCKET_NAME: processedAssetsBucket.bucketName,
            /* eslint-enable @typescript-eslint/naming-convention */
        };

        // Lambda function used to validate inputs in the step function
        const inputValidationFunction = new lambda.Function(
            this,
            'inputValidationFunction',
            {
                ...ingestionLambdaCommonProps,
                code: lambda.Code.fromAsset(
                    path.join(constants.BACKEND_DIR, 'ingestion', 'input_validation')
                ),
                environment: {
                    ...constants.LAMBDA_COMMON_ENVIRONMENT,
                    ...ingestionLambdaCommonEnvironment,

                    /* eslint-disable @typescript-eslint/naming-convention */
                    POWERTOOLS_SERVICE_NAME: 'ingestion-input-validation',
                    /* eslint-enable @typescript-eslint/naming-convention */
                },
            }
        );
        inputAssetsBucket.grantRead(inputValidationFunction);
        processedAssetsBucket.grantWrite(inputValidationFunction);
        cacheTable.grantReadData(inputValidationFunction);

        // Lambda function performing the embedding job
        const embeddingsFunction = new lambda.Function(this, 'embeddingsFunction', {
            ...ingestionLambdaCommonProps,
            code: lambda.Code.fromAsset(
                path.join(constants.BACKEND_DIR, 'ingestion', 'embeddings')
            ),
            environment: {
                ...constants.LAMBDA_COMMON_ENVIRONMENT,
                ...ingestionLambdaCommonEnvironment,

                /* eslint-disable @typescript-eslint/naming-convention */
                POWERTOOLS_SERVICE_NAME: 'ingestion-embeddings',
                RDS_SECRET_ARN: props.rdsSecret.secretArn,
                RDS_ENDPOINT: props.rdsEndpoint,
                CHUNK_SIZE_DOC_SPLIT: constants.CHUNK_SIZE_DOC_SPLIT,
                OVERLAP_FOR_DOC_SPLIT: constants.OVERLAP_FOR_DOC_SPLIT,

                /* eslint-enable @typescript-eslint/naming-convention */
            },
        });
        processedAssetsBucket.grantRead(embeddingsFunction);
        inputAssetsBucket.grantRead(embeddingsFunction);
        props.baseInfra.configTable.grantReadData(embeddingsFunction);
        props.baseInfra.grantBedrockEmbeddingsModelAccess(embeddingsFunction);
        props.baseInfra.grantSagemakerEmbeddingsModelAccess(embeddingsFunction);
        props.rdsSecret.grantRead(embeddingsFunction);
        cacheTable.grantWriteData(embeddingsFunction);

        const vectorStoreManagementFunction = new lambda.Function(
            this,
            'vectorStoreManagementFunction',
            {
                ...ingestionLambdaCommonProps,
                code: lambda.Code.fromAsset(
                    path.join(
                        constants.BACKEND_DIR,
                        'ingestion',
                        'vector_store_management'
                    )
                ),
                environment: {
                    ...constants.LAMBDA_COMMON_ENVIRONMENT,
                    ...ingestionLambdaCommonEnvironment,

                    /* eslint-disable @typescript-eslint/naming-convention */
                    POWERTOOLS_SERVICE_NAME: 'ingestion-vector-store-management',
                    RDS_SECRET_ARN: props.rdsSecret.secretArn,
                    RDS_ENDPOINT: props.rdsEndpoint,
                    CHUNK_SIZE_DOC_SPLIT: constants.CHUNK_SIZE_DOC_SPLIT,
                    OVERLAP_FOR_DOC_SPLIT: constants.OVERLAP_FOR_DOC_SPLIT,

                    /* eslint-enable @typescript-eslint/naming-convention */
                },
            }
        );
        props.rdsSecret.grantRead(vectorStoreManagementFunction);

        // Step function definition
        const inputValidationTask = new stepfn_task.LambdaInvoke(
            this,
            'Detect and identify documents for ingestion',
            {
                lambdaFunction: inputValidationFunction,
                payload: stepfn.TaskInput.fromObject(startState),
                resultSelector: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    'Payload.$': '$.Payload',
                },
            }
        );

        const embeddingsTask = new stepfn_task.LambdaInvoke(
            this,
            'Generate embeddings from processed documents and store them',
            {
                lambdaFunction: embeddingsFunction,
            }
        );

        const vectorStoreManagementTask = new stepfn_task.LambdaInvoke(
            this,
            'Vector store management task',
            {
                lambdaFunction: vectorStoreManagementFunction,
                payload: stepfn.TaskInput.fromJsonPathAt('$$.Execution.Input'),
                resultPath: stepfn.JsonPath.DISCARD,
            }
        );

        const ingestionChoice = new stepfn.Choice(
            this,
            'Are there any documents that need to be ingested?'
        );

        const runFilesInParallel = new stepfn.DistributedMap(this, 'DistributedMap', {
            maxConcurrency:
                props.baseInfra.systemConfig.ingestionConfig?.maxConcurrency ?? 50,
            itemReader: new stepfn.S3JsonItemReader({
                bucket: processedAssetsBucket,
                key: stepfn.JsonPath.format(
                    'ingestion_input/{}/config.json',
                    stepfn.JsonPath.stringAt('$$.Execution.Name')
                ),
            }),
            resultWriter: new stepfn.ResultWriter({
                bucket: processedAssetsBucket,
                prefix: stepfn.JsonPath.format(
                    'ingestion_output/{}/sf-results',
                    stepfn.JsonPath.stringAt('$$.Execution.Name')
                ),
            }),
        }).itemProcessor(embeddingsTask);

        const succeedTask = new stepfn.Succeed(this, 'Succeed');

        const definition = inputValidationTask.next(
            ingestionChoice
                .when(
                    stepfn.Condition.booleanEquals('$.Payload.isValid', false),
                    succeedTask
                )
                .otherwise(
                    vectorStoreManagementTask.next(runFilesInParallel).next(succeedTask)
                )
        );

        const logGroup = new logs.LogGroup(this, 'IngestionStateMachineLogGroup');

        const ingestionStateMachine = new stepfn.StateMachine(
            this,
            'IngestionStateMachine',
            {
                definitionBody: stepfn.DefinitionBody.fromChainable(definition),
                tracingEnabled: true,
                logs: {
                    destination: logGroup,
                    level: stepfn.LogLevel.ALL,
                },
            }
        );

        this.ingestionStateMachine = ingestionStateMachine;
        this.embeddingsFunction = embeddingsFunction;
        this.inputValidationFunction = inputValidationFunction;
    }
}
