/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import { Badge } from '@cloudscape-design/components';
import Button from '@cloudscape-design/components/button';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { nanoid } from 'nanoid';
import { useCallback, useEffect, useState } from 'react';
import { useRuntimeConfig } from '../../../Auth';
import { useCreateChatMessageMutation } from '../../../hooks';
import { Chat, useDefaultApiWebSocketClient, useOnUpdateInferenceStatus } from '../../../react-query-hooks';

export default function HumanInputForm(props: { chat: Chat; onSuccess?: () => void }) {
  const [currentHumanMessage, setCurrentHumanMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const onSuccess = useCallback(() => {
    props.onSuccess && props.onSuccess();
  }, [props.onSuccess]);

  const { useStreaming } = useRuntimeConfig();
  const createChatMessage = useCreateChatMessageMutation(props.chat.chatId, onSuccess);

  const wsClient = useDefaultApiWebSocketClient();

  useEffect(() => {
    if (!useStreaming) {
      setIsLoading(createChatMessage.isLoading);
    }
  }, [useStreaming, createChatMessage.isLoading]);

  useOnUpdateInferenceStatus(
    (input) => {
      if (input.chatId === props.chat.chatId && input.operation === 'HandleSendMessage') {
        if (input.status === 'SUCCESS') {
          setIsLoading(false);
        }
      }
    },
    [props.chat],
  );

  async function sendMessage() {
    if (useStreaming) {
      setIsLoading(true);
      await wsClient.sendChatMessage({
        chatId: props.chat.chatId,
        question: currentHumanMessage,
        tmpMessageId: nanoid(32),
      });
    } else {
      await createChatMessage.mutateAsync({
        chatId: props.chat.chatId,
        // @ts-ignore - incorrect
        createChatMessageRequestContent: {
          question: currentHumanMessage,
        },
      });
    }
    setCurrentHumanMessage('');
  }

  return (
    <SpaceBetween direction="vertical" size="m">
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: '100%',
          gap: '14px',
          alignItems: 'center',
          maxHeight: 300,
        }}
      >
        <div style={{ flex: 1 }}>
          <textarea
            value={currentHumanMessage}
            onChange={({ target }) => setCurrentHumanMessage(target.value)}
            disabled={isLoading}
            onKeyUp={
              currentHumanMessage.length
                ? ({ ctrlKey, key }) => {
                    if (ctrlKey && key === 'Enter') {
                      sendMessage().catch(console.error);
                    }
                  }
                : undefined
            }
            style={{
              minHeight: 80,
              maxHeight: 300,
              width: '90%',
              resize: 'vertical',
              borderRadius: 10,
              padding: 8,
            }}
          />
        </div>
        <div
          style={{
            minWidth: 80,
            maxWidth: 120,
            alignSelf: 'flex-end',
            flex: 1,
          }}
        >
          <SpaceBetween direction="vertical" size="xs">
            <Button
              fullWidth={true}
              variant="primary"
              onClick={sendMessage}
              loading={isLoading}
              disabled={!currentHumanMessage.length}
            >
              Send
            </Button>
            <div style={{ opacity: 0.3, transform: 'scale(0.75)', width: 80 }}>
              <Badge>⌃</Badge> + <Badge>⏎</Badge>
            </div>
          </SpaceBetween>
        </div>
      </div>
    </SpaceBetween>
  );
}
