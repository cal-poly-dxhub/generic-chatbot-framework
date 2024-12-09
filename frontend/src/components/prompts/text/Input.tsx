/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import Textarea from '@cloudscape-design/components/textarea';

type TextPromptInputProps = {
  text: string;
  onSend: (text: string) => void;
};

export default function TextPromptInputProps({ text = '', onSend }: TextPromptInputProps) {
  return <Textarea onChange={({ detail }) => onSend(detail.value)} value={text} placeholder="Prompt" />;
}
