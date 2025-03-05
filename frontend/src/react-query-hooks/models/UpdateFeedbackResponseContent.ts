/* tslint:disable */
/* eslint-disable */
/**
 *
 * @export
 * @interface UpdateFeedbackResponseContent
 */
export interface UpdateFeedbackResponseContent {
  /**
   * Confirmation of the received feedback
   * @type {string}
   * @memberof UpdateFeedbackResponseContent
   */
  chatId: string;
}

/**
 * Check if a given object implements the UpdateFeedbackResponseContent interface.
 */
export function instanceOfUpdateFeedbackResponseContent(value: object): boolean {
  if (typeof value !== 'object' || value === null) return false;

  const { chatId } = value as { chatId?: unknown };

  return chatId !== undefined && typeof chatId === 'string';
}

export function UpdateFeedbackResponseContentFromJSON(json: any): UpdateFeedbackResponseContent {
  return UpdateFeedbackResponseContentFromJSONTyped(json, false);
}

export function UpdateFeedbackResponseContentFromJSONTyped(
  json: any,
  _ignoreDiscriminator: boolean,
): UpdateFeedbackResponseContent {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    chatId: json['chatId'],
  };
}

export function UpdateFeedbackResponseContentToJSON(value?: UpdateFeedbackResponseContent | null): any {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return {
    chatId: value.chatId,
  };
}
