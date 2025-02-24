/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/

import { Button } from '@cloudscape-design/components';
import Input from '@cloudscape-design/components/input';
import * as React from 'react';

const HandoffMessageContents: React.FC = () => {
  const [email, setEmail] = React.useState<string>('');
  const [valid, setValid] = React.useState<boolean>(false);

  const quickValidateEmail = (address: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(address).toLowerCase());
  };

  const onAcceptClick = () => {
    console.log('Accept handoff');
  };

  return (
    <div style={{ display: 'flex', width: '100%', margin: '10px 0' }}>
      <div style={{ flex: '0 0 65%' }}>
        <Input
          type="email"
          value={email}
          placeholder="Enter your email"
          onChange={({ detail }) => {
            setEmail(detail.value);
            setValid(quickValidateEmail(detail.value));
            console.log('email', detail.value);
          }}
        />
      </div>
      <div style={{ flex: '0 0 5%' }} />
      <div style={{ flex: '0 0 30%' }}>
        <Button disabled={!valid} onClick={onAcceptClick}>
          Send
        </Button>
      </div>
    </div>
  );
};

export default HandoffMessageContents;
