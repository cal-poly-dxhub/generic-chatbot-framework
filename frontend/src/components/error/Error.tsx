/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/

import { Alert } from '@cloudscape-design/components';
import { FC, ReactNode } from 'react';

export interface ErrorPageProps {
  readonly errors: any[];
  readonly header?: ReactNode;
}

export const ErrorPage: FC<ErrorPageProps> = ({ header, errors }) => {
  return (
    <>
      {errors.map((err, idx) => (
        <Alert key={`err-alert-${idx}`} type="error" header={header ?? err.status ?? 'Error'}>
          {err.message ?? JSON.stringify(err)}
        </Alert>
      ))}
    </>
  );
};
