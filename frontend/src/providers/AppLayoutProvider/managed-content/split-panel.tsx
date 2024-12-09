/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import { SplitPanel, SplitPanelProps } from '@cloudscape-design/components';
import { managedContentFactory } from './base';

const {
  Context: SplitPanelContext,
  Provider: SplitPanelProvider,
  Hook: useSplitPanel,
  ManagedItemComponent: ManagedSplitPanel,
} = managedContentFactory<SplitPanelProps>(SplitPanel);

export { SplitPanelContext, SplitPanelProvider, useSplitPanel, ManagedSplitPanel };
