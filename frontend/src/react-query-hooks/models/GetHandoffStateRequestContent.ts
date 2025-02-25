/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
export interface GetHandoffStateRequestContent {
  // Nothing here; created to follow schema. We just need the chat ID, which is in the encompassing object.
}

export function instanceOfGetHandoffStateRequestContent(value: object): boolean {
  return Object.keys(value).length === 0;
}

export function GetHandoffStateRequestContentToJSON(value?: GetHandoffStateRequestContent | null): any {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return {};
}

export function GetHandoffStateRequestContentFromJSON(json: any): GetHandoffStateRequestContent {
  return GetHandoffStateRequestContentFromJSONTyped(json, false);
}

export function GetHandoffStateRequestContentFromJSONTyped(
  json: any,
  _ignoreDiscriminator: boolean,
): GetHandoffStateRequestContent {
  if (json === undefined || json === null) {
    return json;
  }
  return {};
}
