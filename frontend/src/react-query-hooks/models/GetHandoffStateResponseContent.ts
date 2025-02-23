export interface GetHandoffStateResponseContent {
  /**
   *
   * @type: {boolean}
   * @memberof GetHandoffStateResponseContent
   */
  handoffStatus: string; // in
}

/**
 * Check if a given object implements the GetHandoffStateResponseContent interface.
 */
export function instanceOfGetHandoffStateResponseContent(value: object): boolean {
  let isInstance = true;
  isInstance = isInstance && 'handoffStatus' in value;
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
    handoffStatus: json['handoffStatus'],
  };
}

export function GetHandoffStateResponseContentToJSON(value?: GetHandoffStateResponseContent | null): any {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return {
    handoffStatus: value.handoffStatus,
  };
}
