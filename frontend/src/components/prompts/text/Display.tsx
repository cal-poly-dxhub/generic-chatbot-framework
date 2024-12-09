/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
type TextPromptDisplayProps = {
  text: string;
};

export default function TextPromptDisplayProps({ text = '' }: TextPromptDisplayProps) {
  return <p>{text}</p>;
}
