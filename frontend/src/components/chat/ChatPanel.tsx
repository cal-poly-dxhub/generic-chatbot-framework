/* eslint-disable */
/* prettier-ignore */

/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import { SpaceBetween, StatusIndicator, Modal } from '@cloudscape-design/components';
import Header from '@cloudscape-design/components/header';
import { useCallback, useRef, useState, useEffect } from 'react';
import DeleteChatButton from './components/DeleteChatButton';
import ExportChat from './components/ExportChat';
import HumanInputForm from './components/HumanInputForm';
import { ConversationView } from './ConversationView';
import { useInprogressMessages } from '../../hooks';
import { useUpdateChatMutation, useLoadExemptionTree, useCloseExemptionMutation } from '../../hooks/chats';
import { Chat, useOnUpdateInferenceStatus } from '../../react-query-hooks';
import InlineEditor from '../InlineEditor';
import DecisionTreeForm, { Answer, DecisionNode } from './exemption/ExemptionForm';

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

type SessionChatProps = {
  chat: Chat;
};

export default function ChatPanel(props: SessionChatProps) {
  const conversationRef = useRef<HTMLDivElement>(null);
  const updateChat = useUpdateChatMutation();
  const inprogressMessages = useInprogressMessages(props.chat.chatId);

  const lastInprogressMessage = inprogressMessages?.statusUpdates[inprogressMessages?.statusUpdates.length - 1];

  const onMessageSuccess = useCallback(async () => {
    // scroll to new message when created
    await delay(100);
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [conversationRef]);

  const [exemptionTree, setExemptionTree] = useState<DecisionNode | null>(null);
  const { data: exemptionTreeData, refetch: refetchTree } = useLoadExemptionTree({ chatId: props.chat.chatId });
  const closeExemption = useCloseExemptionMutation(props.chat.chatId, () => { });

  useOnUpdateInferenceStatus(
    (input) => {
      if (input.payload?.useExemptionLogic) {
        refetchTree()
      }
    },
    [props.chat.chatId],
  );

  useEffect(() => {
    if (exemptionTreeData?.decisionTree) {
      const parsedTree = JSON.parse(exemptionTreeData.decisionTree);

      if (parsedTree.error) {
        setExemptionTree(null);
      } else {
        setExemptionTree(parsedTree);
      }

    } else {
      setExemptionTree(null);
    }
  }, [exemptionTreeData]);

  const onExemptionSubmit = (answers: Answer[]) => {
    const request = {
      answers: answers.map((answer) => answer.answer),
    }

    setExemptionTree(null);

    closeExemption.mutateAsync({
      chatId: props.chat.chatId,
      closeExemptionRequestContent: request,
    }).then(() => {
      refetchTree();
    });
  };

  const onExemptionDismiss = () => {
    closeExemption.mutateAsync({
      chatId: props.chat.chatId,
      closeExemptionRequestContent: { answers: null },
    }).then(() => {
      refetchTree();
    });
  }

  async function updateChatTitle(title: string) {
    await updateChat.mutateAsync({
      chatId: props.chat.chatId,
      updateChatRequestContent: {
        title,
      },
    });
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        flex: 1,
      }}
    >
      <Header
        variant="h3"
        actions={
          <SpaceBetween size="xxxs" direction="horizontal">
            <ExportChat chat={props.chat} />
            <DeleteChatButton chat={props.chat} />
          </SpaceBetween>
        }
      >
        <InlineEditor loading={updateChat.isLoading} onChange={updateChatTitle}>
          {props.chat.title}
        </InlineEditor>
      </Header>

      {/* Dialog */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifySelf: 'stretch',
          alignSelf: 'stretch',
          overflow: 'hidden',
        }}
      >
        <ConversationView ref={conversationRef} chatId={props.chat.chatId} />
      </div>

      {/* Input  */}
      <div
        style={{
          flex: 0,
        }}
      >
        <HumanInputForm chat={props.chat} onSuccess={onMessageSuccess} />
        <SpaceBetween direction="horizontal" size="m">
          {
            inprogressMessages != null && lastInprogressMessage && (
              <>
                Current status:{' '}
                <StatusIndicator
                  key={`${lastInprogressMessage.messageId}`}
                  type={lastInprogressMessage.status === 'SUCCESS' ? 'success' : 'in-progress'}
                >
                  {lastInprogressMessage.operation}
                </StatusIndicator>
              </>
            )
            // TODO: create a progress bar where these updates are bullets that show status
            // inprogressMessages.statusUpdates.map((update, idx) => (
            //   <StatusIndicator
            //     key={`${update.messageId}-${idx}`}
            //     type={update.status === 'SUCCESS' ? 'success' : 'in-progress'}
            //   >
            //     {update.operation}
            //   </StatusIndicator>
            // ))
          }
        </SpaceBetween>
      </div>

      {/* Modal for exemption decision tree processing */}
      <Modal
        visible={exemptionTree != null && exemptionTree !== undefined}
        onDismiss={onExemptionDismiss}
        header="What exemption forms should I fill out?"
        closeAriaLabel="Submit"
      >
        {exemptionTree && <DecisionTreeForm onSubmit={onExemptionSubmit} tree={exemptionTree} />}
      </Modal>
    </div>
  );
}
