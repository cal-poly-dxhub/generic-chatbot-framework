/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import { createContext, ReactNode, FC } from 'react';
import { DefaultApiWebSocketClient } from '../client';

export const DefaultApiWebSocketClientContext = createContext<DefaultApiWebSocketClient | undefined>(undefined);

export interface DefaultApiWebSocketClientProviderProps {
  readonly client: DefaultApiWebSocketClient;
  readonly children?: ReactNode;
}

export const DefaultApiWebSocketClientProvider: FC<DefaultApiWebSocketClientProviderProps> = (props) => {
  return (
    <DefaultApiWebSocketClientContext.Provider value={props.client}>
      {props.children}
    </DefaultApiWebSocketClientContext.Provider>
  );
};
