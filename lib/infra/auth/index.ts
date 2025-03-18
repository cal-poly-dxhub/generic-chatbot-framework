/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
*/
import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognitoIdentityPool from '@aws-cdk/aws-cognito-identitypool-alpha';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { SolutionInfo } from '../common/types';
import * as constants from '../common/constants';

export interface AuthenticationProps {
    readonly adminEmail: string;
    readonly solutionInfo: SolutionInfo;
    readonly cloudFrontDomainName: string;
    readonly removalPolicy?: cdk.RemovalPolicy;
}

const userPoolProperties = {
    deletionProtection: true,
    passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(3),
    },
    mfa: cognito.Mfa.REQUIRED,
    mfaSecondFactor: { sms: true, otp: true },
    signInCaseSensitive: false,
    advancedSecurityMode: cognito.AdvancedSecurityMode.ENFORCED,
    signInAliases: { email: true },
    accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    selfSignUpEnabled: false,
    standardAttributes: {
        phoneNumber: { required: false },
        email: { required: true },
        givenName: { required: true },
        familyName: { required: true },
    },
    autoVerify: {
        email: true,
        phone: true,
    },
    keepOriginal: {
        email: true,
        phone: true,
    },
};

export class Authentication extends Construct {
    public readonly appClientId: string;
    public readonly userPool: cognito.IUserPool;
    public readonly identityPool: cognitoIdentityPool.IdentityPool;

    public constructor(scope: Construct, id: string, props: AuthenticationProps) {
        super(scope, id);

        const userPool = new cognito.UserPool(this, 'UserPool', {
            userInvitation: {
                emailSubject: `Welcome to ${props.solutionInfo.solutionName}`,
                emailBody: `
                <p>
                   Please use the credentials below to login to the ${props.solutionInfo.solutionName} UI.
                </p>
                <p>
                    Username: <strong>{username}</strong>
                </p>
                <p>
                    Temporary Password: <strong>{####}</strong>
                </p>
                <p>
                    Solution UI: <strong>https://${props.cloudFrontDomainName}/</strong>
                </p>
              `,
            },
            ...userPoolProperties,
            removalPolicy: props.removalPolicy,
        });

        const userPoolClient = userPool.addClient('UserPoolClient', {
            generateSecret: false,
            authFlows: {
                userPassword: true,
                userSrp: true,
            },
        });

        const identityPool = new cognitoIdentityPool.IdentityPool(this, 'IdentityPool', {
            authenticationProviders: {
                userPools: [
                    new cognitoIdentityPool.UserPoolAuthenticationProvider({
                        userPool,
                        userPoolClient,
                    }),
                ],
            },
        });

        new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
            userPoolId: userPool.userPoolId,
            description: 'Administrator group',
            groupName: constants.COGNITO_ADMIN_GROUP_NAME,
        });

        const adminUser = new cognito.CfnUserPoolUser(this, 'AdminUser', {
            userPoolId: userPool.userPoolId,
            desiredDeliveryMediums: ['EMAIL'],
            forceAliasCreation: true,
            userAttributes: [
                { name: 'email_verified', value: 'true' },
                { name: 'email', value: props.adminEmail },
            ],
            username: props.adminEmail,
        });

        const adminUserAttachment = new cognito.CfnUserPoolUserToGroupAttachment(
            this,
            'AdminUserAttachment',
            {
                groupName: constants.COGNITO_ADMIN_GROUP_NAME,
                userPoolId: userPool.userPoolId,
                username: props.adminEmail,
            }
        );
        adminUserAttachment.addDependency(adminUser);

        this.userPool = userPool;
        this.identityPool = identityPool;
        this.appClientId = userPoolClient.userPoolClientId;
    }

    public grantUserPoolAccess(lambda: lambda.IFunction): void {
        lambda.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['cognito-idp:AdminGetUser', 'cognito-idp:ListUsers'],
                resources: [this.userPool.userPoolArn],
            })
        );
    }
}
