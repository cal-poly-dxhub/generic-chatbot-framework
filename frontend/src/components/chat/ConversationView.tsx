/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import { Alert, Spinner } from '@cloudscape-design/components';
import { forwardRef, useEffect, useMemo, useRef } from 'react';
import Message, { ComponentMessage } from './Message';
import { CHAT_MESSAGE_PARAMS, useInprogressMessages, useListChatMessages } from '../../hooks';
import { ChatMessage } from '../../react-query-hooks';
import EmptyState from '../Empty';
import HandoffMessageContents from './HandoffButton';

type ConversationViewProps = {
  chatId: string;
};

export const ConversationView = forwardRef((props: ConversationViewProps, ref: React.ForwardedRef<HTMLDivElement>) => {
  const { chatId } = props;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data, error, fetchNextPage, isFetching, isLoading, hasNextPage, refetch } = useListChatMessages({
    chatId,
    ...CHAT_MESSAGE_PARAMS,
  });

  const inprogressMessages = useInprogressMessages(chatId, refetch);

  const messages = useMemo<ChatMessage[]>(() => {
    const _messages = data?.pages?.flatMap((p) => p.chatMessages || (p as any).data || []) ?? [];
    if (inprogressMessages != null) {
      _messages.push(inprogressMessages.human, inprogressMessages.ai);
    }
    return _messages;
  }, [data, inprogressMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // TODO: load next page on scroll in view of last
  // Should we load newest items first?
  // Should we scroll the last message into view always?
  useEffect(() => {
    if (!isFetching && hasNextPage) {
      fetchNextPage().catch(console.error);
    }
  }, [hasNextPage && isFetching]);

  // TODO: use chat ID and user ID here to determine handoff state

  // TODO: just conditionally render this if handoff was triggered
  const HandoffButton = <ComponentMessage component={<HandoffMessageContents />} />;

  return (
    <>
      {error && <Alert type="error">{(error as Error).message || String(error)}</Alert>}
      <div
        ref={ref}
        style={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          backgroundColor: '#fcfcfc',
          padding: '4px',
          boxSizing: 'border-box',
          overflowY: 'scroll',
        }}
      >
        {messages.length === 0 && !isLoading && <EmptyState title="No messages" subtitle="No messages to display." />}
        {messages.map((message) => (
          <Message
            message={message}
            key={message.messageId}
            humanStyles={{
              backgroundColor: '#ffffff',
            }}
            aiStyles={{
              backgroundColor: '#efefef',
            }}
          />
        ))}
        {HandoffButton}
        {(isLoading || isFetching) && (
          <div
            style={{
              display: 'flex',
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Spinner size="big" />
          </div>
        )}
        <span ref={messagesEndRef} />
      </div>
    </>
  );
});
