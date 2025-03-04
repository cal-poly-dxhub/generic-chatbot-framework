/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/

import { ContentLayout, Header, Link, Box, Container, Spinner } from '@cloudscape-design/components';
import ChatSplitPanel from '../components/chat/ChatSplitPanel';
import { useListChats, useGetChatCost, ChatCostResponseContent } from '../react-query-hooks';

const Chat: React.FC = () => {
  const chatHook = useListChats();
  const chats = chatHook.data?.chats ?? [];

  // Hardcoded chatId for testing
  const hardcodedChatId = '72d183dd-36d5-4d8a-9e76-46ada3483696';
  const costHook = useGetChatCost({ chatId: hardcodedChatId });

  // Ensure type safety
  const costData: ChatCostResponseContent | null = costHook.data ?? null;

  return (
    <>
      {/* First Section */}
      <ContentLayout
        header={
          <Header variant="h1" info={<Link>Info</Link>} description="Content creation chats">
            Chat
          </Header>
        }
      >
        <ChatSplitPanel chats={chats} loading={chatHook.isLoading} />
      </ContentLayout>

      {/* Second Section */}
      <Container
        header={
          <Header variant="h2" description="Cost of conversation">
            Conversation Cost
          </Header>
        }
      >
        {costHook.isLoading ? (
          <Spinner />
        ) : costHook.isError ? (
          <Box color="text-status-error">Error loading cost for chat {hardcodedChatId}</Box>
        ) : costData ? (
          <Box>
            <p>
              <strong>Chat ID:</strong> {hardcodedChatId}
            </p>
            <p>
              <strong>User Cost:</strong> {costData.userCost.toFixed(2)} units
            </p>
            <p>
              <strong>Assistant Cost:</strong> {costData.assistantCost.toFixed(2)} units
            </p>
            <p>
              <strong>Total Cost:</strong> {costData.totalCost.toFixed(2)} units
            </p>
          </Box>
        ) : (
          <Box>No cost data available.</Box>
        )}
      </Container>
    </>
  );
};

export default Chat;
