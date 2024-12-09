/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { DefaultApi } from './DefaultApi';

const queryClient = new QueryClient();

/**
 * Default QueryClient context for DefaultApi
 */
export const DefaultApiDefaultContext = React.createContext<QueryClient | undefined>(undefined);

/**
 * Context for the API client used by the hooks.
 */
export const DefaultApiClientContext = React.createContext<DefaultApi | undefined>(undefined);

/**
 * Properties for the DefaultApiClientProvider
 */
export interface DefaultApiClientProviderProps {
  readonly apiClient: DefaultApi;
  readonly client?: QueryClient;
  readonly context?: React.Context<QueryClient | undefined>;
  readonly children?: React.ReactNode;
}

/**
 * Provider for the API Client and Query Client used by the hooks.
 * This must parent any components which make use of the hooks.
 */
export const DefaultApiClientProvider = ({
  apiClient,
  client = queryClient,
  context = DefaultApiDefaultContext,
  children,
}: DefaultApiClientProviderProps): JSX.Element => {
  return (
    <QueryClientProvider client={client} context={context}>
      <DefaultApiClientContext.Provider value={apiClient}>{children}</DefaultApiClientContext.Provider>
    </QueryClientProvider>
  );
};
