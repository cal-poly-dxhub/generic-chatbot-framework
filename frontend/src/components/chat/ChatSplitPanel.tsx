/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import { Container } from '@cloudscape-design/components';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import ChatPanel from './ChatPanel';
import ChatsList from './ChatsList';
import { Chat } from '../../react-query-hooks';

type SessionsProps = {
  chats: Chat[];
  loading: boolean;
};

export default function Sessions({ chats, loading }: SessionsProps) {
  const navigate = useNavigate();

  const setSelectedChat = (chat: Chat) => navigate(`/chat/${chat.chatId}`, { replace: true });

  const { id: chatId } = useParams();
  const selectedChat = chats.find((chat) => chat.chatId === chatId)!;

  if (!chatId && chats !== undefined && chats.length > 0) {
    return <Navigate to={`/chat/${chats[0].chatId}`} />;
  }

  return (
    <Container>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          flex: 1,
          height: 'calc(90vh - 150px)',
          minHeight: 500,
          gap: 20,
        }}
      >
        <div
          style={{
            width: 300,
            flex: 'none',
            padding: 7,
            overflow: 'auto',
          }}
        >
          <ChatsList
            loading={loading}
            items={chats ?? []}
            selectedItem={selectedChat}
            onSelect={(chat) => setSelectedChat(chat)}
          />
        </div>
        <div
          style={{
            display: 'flex',
            flex: 1,
          }}
        >
          {selectedChat && (
            <>
              <ChatPanel chat={selectedChat} />
            </>
          )}
        </div>
      </div>
    </Container>
  );
}
