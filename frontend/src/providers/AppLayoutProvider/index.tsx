/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import { FC, PropsWithChildren } from 'react';
import { SplitPanelProvider, HelpPanelProvider } from './managed-content';

export const AppLayoutProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <SplitPanelProvider>
      <HelpPanelProvider>{children}</HelpPanelProvider>
    </SplitPanelProvider>
  );
};
