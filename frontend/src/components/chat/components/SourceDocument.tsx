/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import { Box, Container, ExpandableSection, Grid, Header, TextContent } from '@cloudscape-design/components';
import { FC } from 'react';
import { Document } from '../../../react-query-hooks';

export const SourceDocument: FC<{ title: string; document: Document }> = ({ title, document }) => {
  const scoreText = document.score != null ? `Score: ${document.score} (distance)` : undefined;

  return (
    <Container
      header={
        <Header variant="h3" description={scoreText}>
          {title}
        </Header>
      }
      footer={
        <ExpandableSection headerText="Metadata" variant="footer">
          <Grid>
            {Object.entries(document.metadata).map(([label, value], i) => (
              <div key={i}>
                <Box variant="awsui-key-label">{label}</Box>
                <div>{String(value)}</div>
              </div>
            ))}
          </Grid>
        </ExpandableSection>
      }
    >
      <TextContent>
        <div style={{ whiteSpace: 'pre-wrap' }}>{document.pageContent}</div>
      </TextContent>
    </Container>
  );
};
