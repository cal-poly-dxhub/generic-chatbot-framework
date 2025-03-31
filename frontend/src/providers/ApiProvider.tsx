/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import useSigv4Client from '@aws-northstar/ui/components/CognitoAuth/hooks/useSigv4Client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { FC, useMemo } from 'react';
import { useRuntimeConfig } from '../Auth';
import { Configuration, DefaultApi, DefaultApiClientProvider } from '../react-query-hooks';

export const useApiClient = () => {
  const runtimeConfig = useRuntimeConfig();

  // Accept Cognito token caching; remove credentials on user logout.
  const client = useSigv4Client('execute-api', false);

  return useMemo(
    () =>
      new DefaultApi(
        new Configuration({
          basePath: runtimeConfig.apiUrl,
          fetchApi: client,
        }),
      ),
    [client, runtimeConfig.apiUrl],
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: false,
      refetchInterval: Infinity,
      staleTime: Infinity,
      cacheTime: Infinity,
    },
  },
});

export const ApiProvider: FC<React.PropsWithChildren> = ({ children }) => {
  const apiClient = useApiClient();

  return (
    <QueryClientProvider client={queryClient}>
      <DefaultApiClientProvider apiClient={apiClient} client={queryClient}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </DefaultApiClientProvider>
    </QueryClientProvider>
  );
};
