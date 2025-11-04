/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
*/
import { Construct } from 'constructs';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import { BaseInfra } from '../base-infra';
import * as constants from '../common/constants';

export interface ConversationStoreProps {
    readonly baseInfra: BaseInfra;
}

export class ConversationStore extends Construct {
    public readonly conversationTable: ddb.Table;

    public constructor(scope: Construct, id: string, props: ConversationStoreProps) {
        super(scope, id);

        this.conversationTable = new ddb.Table(this, 'ConversationTable', {
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

        this.conversationTable.addGlobalSecondaryIndex({
            indexName: constants.CONVERSATION_STORE_GSI_INDEX_NAME,
            partitionKey: {
                name: 'GSI1PK',
                type: ddb.AttributeType.STRING,
            },
            sortKey: {
                name: 'GSI1SK',
                type: ddb.AttributeType.STRING,
            },
        });
    }
}
