import { Button } from '@cloudscape-design/components';
import Input from '@cloudscape-design/components/input';
import * as React from 'react';

const HandoffMessageContents: React.FC = () => {
  const [email, setEmail] = React.useState<string>('');
  const [valid, setValid] = React.useState<boolean>(false);

  const quickValidateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const onAcceptClick = () => {
    console.log('Accept handoff');
  }

  return (
    <div style={{ display: 'flex', width: '100%', margin: '10px 0' }}>
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
      <Button disabled={!valid} onClick={onAcceptClick}>
        Accept handoff
      </Button>
    </div>
  );
};

export default HandoffMessageContents;


