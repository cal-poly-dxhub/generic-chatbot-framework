#!/usr/bin/env node
/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
*/
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as constants from '../lib/infra/common/constants';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import configSchema from './config-schema';
import Ajv from 'ajv';
import { FrancisChatbotStack } from '../lib/infra/stacks/francis-stack';
import { SystemConfig } from '../lib/infra/common/types';
import { AwsSolutionsChecks } from 'cdk-nag';
import { applyNagSuppressions } from '../lib/infra/utils/nag-suppressions';

process.env.DOCKER_DEFAULT_PLATFORM = constants.LAMBDA_ARCHITECTURE.dockerPlatform;

const solutionInfo = {
    solutionName: 'Francis GenAI RAG Chatbot on AWS',
    solutionVersion: 'v1.0.1',
};

const app = new cdk.App();
cdk.Aspects.of(app).add(new AwsSolutionsChecks());

let systemConfig: SystemConfig;
const configFilePath = path.join(__dirname, './config.yaml');
if (fs.existsSync(configFilePath)) {
    const config = yaml.load(fs.readFileSync(configFilePath, 'utf8')) as Record<
        string,
        unknown
    >;
    systemConfig = config.systemConfig as SystemConfig;
} else {
    systemConfig = app.node.tryGetContext('systemConfig') as SystemConfig;
}

// Validate system config
// NOTE: note to reviewer: Francis hasn't been using defaults up to this point
const ajv = new Ajv({ useDefaults: true });
const validate = ajv.compile(configSchema);
if (!validate(systemConfig)) {
    throw new Error(`Invalid config: ${JSON.stringify(validate.errors)}`);
}

const stackEnv = systemConfig.applicationName ? `-${systemConfig.applicationName}` : '';
const francisChatbotStack = new FrancisChatbotStack(
    app,
    `FrancisChatbotStack${stackEnv}`,
    {
        systemConfig,
        solutionInfo,
        description: `AWS resources for ${solutionInfo.solutionName}. Version ${solutionInfo.solutionVersion}`,
    }
);
applyNagSuppressions(francisChatbotStack);
