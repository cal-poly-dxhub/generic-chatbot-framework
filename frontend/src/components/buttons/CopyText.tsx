/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import { Button, Popover, StatusIndicator } from '@cloudscape-design/components';

type CopyTextProps = {
  children?: React.ReactNode;
  textToCopy: string;
  contentName: string;
};

function CopyText(props: CopyTextProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'row' }}>
      {props.children}
      <Popover
        size="small"
        position="left"
        triggerType="custom"
        dismissButton={false}
        content={<StatusIndicator type="success">{props.contentName} copied</StatusIndicator>}
      >
        <Button
          variant="inline-icon"
          iconName="copy"
          ariaLabel="Copy text"
          onClick={(): void => {
            navigator.clipboard.writeText(props.textToCopy) as Promise<void>;
          }}
        />
      </Popover>
    </div>
  );
}
export default CopyText;
