/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import Icon from '@cloudscape-design/components/icon';
import { useCollapse } from 'react-collapsed';
import { ChatMessage } from '../../../react-query-hooks';
import CopyText from '../../buttons/CopyText';

type MessageProps = {
  message: ChatMessage;
};

export default function Message({ message }: MessageProps) {
  const { getCollapseProps, getToggleProps, isExpanded } = useCollapse({
    defaultExpanded: true,
  });
  let headerText =
    message.type === 'human' ? 'You asked the Assistant the following:' : 'The Assistant responded with:';
  const time = new Date(message.createdAt).toLocaleString();
  return (
    <div style={{ marginBottom: '12px' }}>
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}
      >
        <span {...getToggleProps()} style={{ fontWeight: 'bold' }}>
          <Icon name={isExpanded ? 'caret-down-filled' : 'caret-right-filled'} />
          {' ' + headerText}
        </span>
        <span style={{ color: '#aaa' }}>{time}</span>
      </div>
      <div {...getCollapseProps()}>
        <CopyText textToCopy={message.text} contentName="Message">
          {message.text}
        </CopyText>
      </div>
    </div>
  );
}
