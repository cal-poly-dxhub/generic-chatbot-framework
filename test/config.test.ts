/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
*/
import Ajv from 'ajv';
import * as yaml from 'js-yaml';
import configSchema from '../bin/config-schema';
import { SystemConfig } from '../lib/infra/common/types';
import * as path from 'path';
import * as fs from 'fs';

test('config-with-summarizer', () => {
    const configFilePath = path.join(__dirname, './test_config_summarizer.yaml');

    const config = yaml.load(fs.readFileSync(configFilePath, 'utf8')) as Record<
        string,
        unknown
    >;
    const systemConfig = config.systemConfig as SystemConfig;

    // Validity
    const ajv = new Ajv();
    const validate = ajv.compile(configSchema);
    expect(validate(systemConfig)).toBe(true);
    expect(systemConfig.handoffConfig).toBeDefined();

    // Access some properties
    expect(systemConfig.handoffConfig.enableHandoff).toBe(true);
    expect(systemConfig.handoffConfig.summaryBufferMessageLimit).toBe(10);
    expect(systemConfig.handoffConfig.handoffModelConfig).toBeDefined();
    expect(systemConfig.handoffConfig.handoffModelConfig?.provider).toBe('bedrock');
    expect(systemConfig.handoffConfig.handoffModelConfig?.modelId).toBe('test-model-id');
});

test('config-no-summarizer', () => {
    // Config files without chatSummarizerConfig are also valid. By default
    // handoff is disabled.

    const configFilePath = path.join(__dirname, './test_config_no_summarizer.yaml');

    const config = yaml.load(fs.readFileSync(configFilePath, 'utf8')) as Record<
        string,
        unknown
    >;
    const systemConfig = config.systemConfig as SystemConfig;

    const ajv = new Ajv({ useDefaults: true });
    const validate = ajv.compile(configSchema);
    expect(validate(systemConfig)).toBe(true);
    expect(systemConfig.handoffConfig).toBeDefined();
    expect(systemConfig.handoffConfig.enableHandoff).toBe(false);
});

test('config-missing-settings', () => {
    /*
     * If the user enabled handoff but did not provide handoffModelConfig,
     * reject through AJV
     */

    const configFilePath = path.join(__dirname, './test_config_missing_model.yaml');

    const config = yaml.load(fs.readFileSync(configFilePath, 'utf8')) as Record<
        string,
        unknown
    >;
    const systemConfig = config.systemConfig as SystemConfig;

    const ajv = new Ajv({ useDefaults: true });
    const validate = ajv.compile(configSchema);
    expect(validate(systemConfig)).toBe(false);
});
