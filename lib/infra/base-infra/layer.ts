/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
*/
import { execSync } from 'child_process';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3assets from 'aws-cdk-lib/aws-s3-assets';
import { Construct } from 'constructs';

export interface LangchainProps {
    /**
     * Whether to retain this version of the layer when a new version is added or when the stack is deleted.
     * @default RemovalPolicy.DESTROY
     * @stability stable
     */
    readonly removalPolicy?: cdk.RemovalPolicy;
    /**
     * The SPDX licence identifier or URL to the license file for this layer.
     * @default - No license information will be recorded.
     * @stability stable
     */
    readonly license?: string;
    /**
     * The name of the layer.
     * @default - A name will be generated.
     * @stability stable
     */
    readonly layerVersionName?: string;
    /**
     * The description the this Lambda Layer.
     * @default - No description.
     * @stability stable
     */
    readonly description?: string;
}

export interface LayerProps extends LangchainProps {
    runtime: lambda.Runtime;
    architecture: lambda.Architecture;
    path: string;
    autoUpgrade?: boolean;
    additionalPackages?: string[];
    local?: 'python' | 'python3';
}

export class Layer extends Construct {
    public layer: lambda.LayerVersion;

    public constructor(scope: Construct, id: string, props: LayerProps) {
        super(scope, id);

        const { runtime, architecture, path, additionalPackages, autoUpgrade, local } =
            props;

        const args = local ? [] : ['-t /asset-output/python'];
        if (additionalPackages) {
            args.push(...additionalPackages);
        }
        if (autoUpgrade) {
            args.push('--upgrade');
        }

        const layerAsset = new s3assets.Asset(this, 'LayerAsset', {
            path,
            bundling: local
                ? {
                      // If local is true use the host to install the requirements
                      image: runtime.bundlingImage,
                      local: {
                          // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
                          tryBundle(outputDir) {
                              execSync(`${local} -m venv venv`);
                              execSync('source venv/bin/activate');
                              execSync(
                                  `pip install -r ${path}/requirements.txt -t ${outputDir}/python ${args.join(' ')}`
                              );
                              return true;
                          },
                      },
                  }
                : {
                      // Default: Docker is used to install the requirements
                      image: runtime.bundlingImage,
                      command: [
                          'bash',
                          '-c',
                          `pip install -r requirements.txt ${args.join(' ')}`,
                      ],
                      securityOpt: 'no-new-privileges:true',
                      network: 'host',
                  },
        });

        const layer = new lambda.LayerVersion(this, 'Layer', {
            code: lambda.Code.fromBucket(layerAsset.bucket, layerAsset.s3ObjectKey),
            compatibleRuntimes: [runtime],
            compatibleArchitectures: [architecture],
            ...props,
        });

        this.layer = layer;
    }
}
