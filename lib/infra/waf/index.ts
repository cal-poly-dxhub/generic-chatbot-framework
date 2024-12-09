/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
*/
import { Construct } from 'constructs';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';

export interface WafWebAclProps {
    wafName: string;
    allowedExternalIPRanges?: string[];
}

export class WafWebAcl extends Construct {
    public readonly webAcl: wafv2.CfnWebACL;

    public constructor(scope: Construct, id: string, props: WafWebAclProps) {
        super(scope, id);

        const webACL = new wafv2.CfnWebACL(this, 'WebAcl', {
            name: `${props.wafName}`,
            defaultAction: props.allowedExternalIPRanges
                ? {
                      block: {
                          customResponse: {
                              responseCode: 403,
                          },
                      },
                  }
                : {
                      allow: {},
                  },
            scope: 'REGIONAL',
            visibilityConfig: {
                cloudWatchMetricsEnabled: true,
                metricName: `${props.wafName}WAFACL`,
                sampledRequestsEnabled: true,
            },
            rules: [
                {
                    name: 'AWS-AWSManagedRulesCommonRuleSet',
                    priority: 2,
                    statement: {
                        managedRuleGroupStatement: {
                            name: 'AWSManagedRulesCommonRuleSet',
                            vendorName: 'AWS',
                        },
                    },
                    overrideAction: {
                        none: {},
                    },
                    visibilityConfig: {
                        cloudWatchMetricsEnabled: true,
                        metricName: 'AWS-AWSManagedRulesCommonRuleSet',
                        sampledRequestsEnabled: true,
                    },
                },
                {
                    name: 'AWS-AWSManagedRulesKnownBadInputsRuleSet',
                    priority: 1,
                    statement: {
                        managedRuleGroupStatement: {
                            name: 'AWSManagedRulesKnownBadInputsRuleSet',
                            vendorName: 'AWS',
                        },
                    },
                    overrideAction: {
                        none: {},
                    },
                    visibilityConfig: {
                        cloudWatchMetricsEnabled: true,
                        metricName: 'AWS-AWSManagedRulesKnownBadInputsRuleSet',
                        sampledRequestsEnabled: true,
                    },
                },
                ...(props.allowedExternalIPRanges
                    ? [
                          {
                              name: 'Restrict-External-IPs',
                              visibilityConfig: {
                                  cloudWatchMetricsEnabled: true,
                                  metricName: 'WafIpSetMetric',
                                  sampledRequestsEnabled: true,
                              },
                              priority: 0,
                              statement: {
                                  ipSetReferenceStatement: {
                                      arn: this.getExternalIpSetArn(
                                          props.allowedExternalIPRanges
                                      ),
                                  },
                              },
                              action: {
                                  allow: {},
                              },
                          },
                      ]
                    : []),
            ],
        });
        this.webAcl = webACL;
    }

    private getExternalIpSetArn(allowedExternalIPRanges: string[]): string {
        const addresses = allowedExternalIPRanges.map((ipRange) => ipRange.trim());

        const externalIpSet = new wafv2.CfnIPSet(this, 'ExternalIpSet', {
            addresses,
            ipAddressVersion: 'IPV4',
            scope: 'REGIONAL',
            name: 'externalIpSet',
        });
        return externalIpSet.attrArn;
    }
}
