/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import { HelpPanel, HelpPanelProps } from '@cloudscape-design/components';
import { managedContentFactory } from './base';

const {
  Context: HelpPanelContext,
  Provider: HelpPanelProvider,
  Hook: useHelpPanel,
  ManagedItemComponent: ManagedHelpPanel,
} = managedContentFactory<HelpPanelProps>(HelpPanel);

export { HelpPanelContext, HelpPanelProvider, useHelpPanel, ManagedHelpPanel };
