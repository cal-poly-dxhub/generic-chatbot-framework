/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
export interface GetHandoffStateResponseContent {
  /**
   *
   * @type {string}
   * @memberof GetHandoffStateResponse
   */

  // TODO: use ORs to define possible values
  handoffState: string;
}

export function instanceOfGetHandoffStateResponseContent(value: object): boolean {
  let isInstance = true;
  isInstance = isInstance && 'handoffState' in value;

  return isInstance;
}

export function GetHandoffStateResponseContentFromJSON(json: any): GetHandoffStateResponseContent {
  return GetHandoffStateResponseContentFromJSONTyped(json, false);
}

export function GetHandoffStateResponseContentFromJSONTyped(
  json: any,
  _ignoreDiscriminator: boolean,
): GetHandoffStateResponseContent {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    handoffState: json.handoffState,
  };
}
