/* tslint:disable */
/* eslint-disable */
/**
 *
 * @export
 * @interface CloseExemptionRequestContent
 */
export interface CloseExemptionRequestContent {
  /**
   *
   * @type {string[] | null}
   * @memberof CloseExemptionRequestContent
   */
  answers: string[] | null;
}

/**
 * Check if a given object implements the CloseExemptionRequestContent interface.
 */
export function instanceOfCloseExemptionRequestContent(value: object): boolean {
  let isInstance = true;
  isInstance = isInstance && 'answers' in value;

  return isInstance;
}

export function CloseExemptionRequestContentFromJSON(json: any): CloseExemptionRequestContent {
  return CloseExemptionRequestContentFromJSONTyped(json, false);
}

export function CloseExemptionRequestContentFromJSONTyped(
  json: any,
  _ignoreDiscriminator: boolean,
): CloseExemptionRequestContent {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    answers: json['answers'] === null ? null : json['answers'],
  };
}

export function CloseExemptionRequestContentToJSON(value?: CloseExemptionRequestContent | null): any {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return {
    answers: value.answers,
  };
}
