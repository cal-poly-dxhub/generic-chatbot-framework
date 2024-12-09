/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import { nanoid } from 'nanoid';
import { useImmer } from 'use-immer';
import {
  useOnStreamLLMResponse,
  ChatMessage,
  useOnUpdateInferenceStatus,
  UpdateInferenceStatusRequestContent,
} from '../react-query-hooks';

export interface InprogressMessages {
  human?: ChatMessage;
  ai?: ChatMessage;
  statusUpdates: UpdateInferenceStatusRequestContent[];
}

export const useInprogressMessages = (chatId: string, listMessagesRefetch?: () => Promise<any>) => {
  const [inprogressMessages, updateInprogressMessages] = useImmer<InprogressMessages | null>(null);

  useOnStreamLLMResponse(
    (input) => {
      if (input.chatId === chatId) {
        updateInprogressMessages((draft) => {
          if (draft == null) {
            draft = {
              ai: { chatId, createdAt: Date.now(), messageId: input.messageId, text: '', type: 'ai' },
              statusUpdates: [],
            };
          }
          draft.ai!.text += input.chunks.join('');
        });
      }
    },
    [chatId],
  );

  useOnUpdateInferenceStatus(
    async (input) => {
      if (input.chatId === chatId) {
        updateInprogressMessages((draft) => {
          draft?.statusUpdates.push(input);
        });

        if (input.operation === 'HandleSendMessage' && input.status === 'STARTING') {
          updateInprogressMessages((draft) => {
            if (draft == null) {
              draft = {
                ai: { chatId, createdAt: Date.now(), messageId: input.messageId, text: '', type: 'ai' },
                statusUpdates: [],
              };
            }
            draft.human = {
              chatId,
              createdAt: Date.now(),
              messageId: nanoid(32),
              text: input.payload as string,
              type: 'human',
            };
            return draft;
          });
        }

        if (input.operation === 'HandleSendMessage' && input.status === 'SUCCESS') {
          // const result = input.payload as CreateChatMessageResponseContent;
          if (listMessagesRefetch) {
            await listMessagesRefetch();
          }
          updateInprogressMessages(() => {
            return null;
          });
        }
      }

      console.log('onUpdateInferenceStatus', input);
    },
    [chatId],
  );

  return inprogressMessages;
};
