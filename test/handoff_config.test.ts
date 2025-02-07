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
    // A config with handoff enabled and every handoffConfig option defined

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
    expect(systemConfig.handoffConfig?.provider).toBe('bedrock');
    expect(systemConfig.handoffConfig?.modelKwargs?.maxTokens).toBe(1024);
    expect(systemConfig.handoffConfig?.modelKwargs?.temperature).toBe(0.1);
    expect(systemConfig.handoffConfig?.modelKwargs?.topP).toBe(0.9);
    expect(systemConfig.handoffConfig?.modelKwargs?.stopSequences).toStrictEqual([]);
    expect(systemConfig.handoffConfig?.details).toBeDefined();
});

test('config-default-kwargs', () => {
    // Configs without modelKwargs or details are valid; we just don't pass them during the
    // LLM API call

    const configFilePath = path.join(__dirname, './test_config_defaults.yaml');

    const config = yaml.load(fs.readFileSync(configFilePath, 'utf8')) as Record<
        string,
        unknown
    >;
    const systemConfig = config.systemConfig as SystemConfig;

    const ajv = new Ajv({ useDefaults: true });
    const validate = ajv.compile(configSchema);
    expect(validate(systemConfig)).toBe(true);
    expect(systemConfig.handoffConfig).toBeDefined();
    expect(systemConfig.handoffConfig?.provider).toBe('bedrock');
});

test('no-handoff', () => {
    // Configs without handoffConfig are okay; this means handoff is disabled

    const configFilePath = path.join(__dirname, './test_config_no_handoff.yaml');

    const config = yaml.load(fs.readFileSync(configFilePath, 'utf8')) as Record<
        string,
        unknown
    >;
    const systemConfig = config.systemConfig as SystemConfig;

    const ajv = new Ajv({ useDefaults: true });
    const validate = ajv.compile(configSchema);
    expect(validate(systemConfig)).toBe(true);
    expect(systemConfig.handoffConfig).toBeUndefined();
});
