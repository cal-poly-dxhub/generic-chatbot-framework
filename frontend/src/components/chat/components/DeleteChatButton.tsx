/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import { Alert, Modal } from '@cloudscape-design/components';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { useCallback, useState } from 'react';
import { useDeleteChatMutation } from '../../../hooks/chats';
import { Chat } from '../../../react-query-hooks';

export default function DeleteChatButton(props: { chat: Chat }) {
  const [visible, setVisible] = useState(false);

  const deleteChat = useDeleteChatMutation(() => {
    setVisible(false);
  });

  const open = useCallback(() => {
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    deleteChat.reset();
  }, [deleteChat]);

  return (
    <>
      <Button variant="inline-icon" iconName="remove" onClick={open} />

      <Modal
        onDismiss={close}
        visible={visible}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={close}>
                Cancel
              </Button>
              {deleteChat.isError ? (
                <Button variant="normal" onClick={() => deleteChat.mutate({ chatId: props.chat.chatId })}>
                  Retry
                </Button>
              ) : (
                <Button
                  variant="primary"
                  loading={deleteChat.isLoading}
                  disabled={deleteChat.isError}
                  onClick={() => {
                    deleteChat.mutate({ chatId: props.chat.chatId });
                  }}
                >
                  Delete
                </Button>
              )}
            </SpaceBetween>
          </Box>
        }
        header="Confirm chat delete"
      >
        {(deleteChat.error as any) && (
          <Alert type="error" header="Failed to delete chat">
            {(deleteChat.error as any).message || deleteChat.error}
          </Alert>
        )}
        <p>
          Are you sure you want to delete the chat?
          <br />
          This operation will delete all of the chat history and can not be reversed.
        </p>
      </Modal>
    </>
  );
}
