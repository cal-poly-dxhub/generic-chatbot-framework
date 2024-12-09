/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import { useContext, useEffect, useCallback, DependencyList } from 'react';
import { DefaultApiWebSocketClientContext } from './DefaultApiWebSocketClientProvider';
import { StreamLLMResponseRequestContent, UpdateInferenceStatusRequestContent } from '../models';

const NO_CLIENT_ERROR = new Error(
  `DefaultApiWebSocketClient is missing. Please ensure you have instantiated the DefaultApiWebSocketClientProvider with a client instance.`,
);

/**
 * Hook to retrieve the websocket client from the context
 */
export const useDefaultApiWebSocketClient = () => {
  const client = useContext(DefaultApiWebSocketClientContext);
  if (!client) {
    throw NO_CLIENT_ERROR;
  }
  return client;
};

/**
 * Listen to StreamLLMResponse messages from the server
 * Provided callback should use the useCallback hook to memoise the function
 */
export const useOnStreamLLMResponse = (
  callback: (input: StreamLLMResponseRequestContent) => void,
  deps: DependencyList,
) => {
  const client = useDefaultApiWebSocketClient();
  const cb = useCallback(callback, deps);
  useEffect(() => {
    return client.onStreamLLMResponse(cb);
  }, [client, cb]);
};

/**
 * Listen to UpdateInferenceStatus messages from the server
 * Provided callback should use the useCallback hook to memoise the function
 */
export const useOnUpdateInferenceStatus = (
  callback: (input: UpdateInferenceStatusRequestContent) => void,
  deps: DependencyList,
) => {
  const client = useDefaultApiWebSocketClient();
  const cb = useCallback(callback, deps);
  useEffect(() => {
    return client.onUpdateInferenceStatus(cb);
  }, [client, cb]);
};
