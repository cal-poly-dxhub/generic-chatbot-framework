/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/

import { Spinner } from '@cloudscape-design/components';
import { FC, useEffect, useRef, useState } from 'react';
import { useRuntimeConfig, useGetIdToken } from '../Auth';
import { ErrorPage } from '../components/error';
import { DefaultApiWebSocketClient, DefaultApiWebSocketClientProvider } from '../react-query-hooks';

const useWebSocketApiClient = () => {
  // Use a ref to ensure that if the effect is retriggered, we do not create a second connection
  const clientPromiseRef = useRef<Promise<DefaultApiWebSocketClient> | null>(null);
  const [client, setClient] = useState<DefaultApiWebSocketClient>();
  const runtimeConfig = useRuntimeConfig();
  const getIdToken = useGetIdToken();

  const [errors, setErrors] = useState<any[] | undefined>();

  useEffect(() => {
    if (clientPromiseRef.current) {
      return;
    }
    void (async () => {
      try {
        clientPromiseRef.current = DefaultApiWebSocketClient.connect({
          url: runtimeConfig.wsApiUrl,
          authentication: {
            custom: async () => ({
              url: `${runtimeConfig.wsApiUrl}?idToken=${await getIdToken()}`,
            }),
          },
        });
        setClient(await clientPromiseRef.current!);
      } catch (err) {
        setErrors(errors == null ? [err] : [...errors, err]);

        console.error(`Error while connecting`, err);
      }
    })();
  }, [setClient, setErrors, errors, clientPromiseRef, getIdToken, runtimeConfig]);

  return { client, errors };
};

export const WsApiProvider: FC<React.PropsWithChildren> = ({ children }) => {
  const { client, errors } = useWebSocketApiClient();

  return client ? (
    <DefaultApiWebSocketClientProvider client={client}>{children}</DefaultApiWebSocketClientProvider>
  ) : errors ? (
    <ErrorPage header="Error while establishing websocket connection" errors={errors} />
  ) : (
    <>
      Establishing websocket connection <Spinner />
    </>
  );
};
