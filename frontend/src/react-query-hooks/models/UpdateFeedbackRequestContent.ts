/* tslint:disable */
/* eslint-disable */
/**
 *
 * @export
 * @interface UpdateFeedbackRequestContent
 */
export interface UpdateFeedbackRequestContent {
  /**
   *
   * @type {'up' | 'down'}
   * @memberof UpdateFeedbackRequestContent
   */
  thumb?: 'up' | 'down';

  /**
   *
   * @type {string}
   * @memberof UpdateFeedbackRequestContent
   */
  feedback?: string;

  /**
   *
   * @type {string}
   * @memberof UpdateFeedbackRequestContent
   */
  messageId: string;
}

/**
 * Check if a given object implements the UpdateFeedbackRequestContent interface.
 */
export function instanceOfUpdateFeedbackRequestContent(value: object): boolean {
  if (typeof value !== 'object' || value === null) return false;

  const { thumb, feedback, messageId } = value as { thumb?: unknown; feedback?: unknown; messageId?: unknown };

  return (
    (thumb === undefined || thumb === 'up' || thumb === 'down') &&
    (feedback === undefined || typeof feedback === 'string') &&
    typeof messageId === 'string'
  );
}

export function UpdateFeedbackRequestContentFromJSON(json: any): UpdateFeedbackRequestContent {
  return UpdateFeedbackRequestContentFromJSONTyped(json, false);
}

export function UpdateFeedbackRequestContentFromJSONTyped(
  json: any,
  _ignoreDiscriminator: boolean,
): UpdateFeedbackRequestContent {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    thumb: json['thumb'],
    feedback: json['feedback'],
    messageId: json['messageId'],
  };
}

export function UpdateFeedbackRequestContentToJSON(value?: UpdateFeedbackRequestContent | null): any {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }

  // TODO: can this be a subset?
  return {
    thumb: value.thumb,
    feedback: value.feedback,
  };
}
