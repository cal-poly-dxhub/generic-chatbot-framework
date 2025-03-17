/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import React from 'react';
import Button from '@cloudscape-design/components/button';
import { useDownloadFeedbackReport } from '../../../hooks/chats';

export const FeedbackDownloadButton: React.FC = () => {
  const { mutate: downloadFeedback, isLoading } = useDownloadFeedbackReport();
  return (
    <Button variant="primary" onClick={() => downloadFeedback({})} loading={isLoading} disabled={isLoading}>
      Download Feedback
    </Button>
  );
};
