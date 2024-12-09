/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import Link from '@cloudscape-design/components/link';
import ChatSplitPanel from '../components/chat/ChatSplitPanel';
import { useListChats } from '../react-query-hooks';

const Chat: React.FC = () => {
  const chatHook = useListChats({});
  const chats = chatHook.data?.chats ?? [];

  return (
    <ContentLayout
      header={
        <Header variant="h1" info={<Link>Info</Link>} description="Content creation chats">
          Chat
        </Header>
      }
    >
      <ChatSplitPanel chats={chats} loading={chatHook.isLoading} />
    </ContentLayout>
  );
};

export default Chat;
