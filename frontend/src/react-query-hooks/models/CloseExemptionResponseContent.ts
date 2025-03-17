/* tslint:disable */
/* eslint-disable */
import { exists } from '../runtime';
import type { ChatMessage } from './ChatMessage';
import { ChatMessageFromJSON, ChatMessageToJSON } from './ChatMessage';
import type { ChatMessageSource } from './ChatMessageSource';
import { ChatMessageSourceFromJSON, ChatMessageSourceToJSON } from './ChatMessageSource';

/*
 *
 * @export
 * @interface CloseExemptionResponseContent
 */
export interface CloseExemptionResponseContent {
  /**
   *
   * @type {ChatMessage | undefined}
   * @memberof CloseExemptionResponseContent
   */
  question?: ChatMessage;

  /**
   *
   * @type {ChatMessage | undefined}
   * @memberof CloseExemptionResponseContent
   */
  answer?: ChatMessage;

  /**
   *
   * @type {Array<ChatMessageSource>}
   * @memberof CloseExemptionResponseContent
   */
  sources?: Array<ChatMessageSource>;

  /**
   * A type for any object
   * @type {any | null}
   * @memberof CloseExemptionResponseContent
   */
  traceData?: any | null;
}

/**
 * Check if a given object implements the CloseExemptionResponseContent interface.
 */
export function instanceOfCloseExemptionResponseContent(value: object): boolean {
  let isInstance = true;
  if ('sources' in value) {
    return true;
  }
  isInstance = isInstance && 'question' in value;
  isInstance = isInstance && 'answer' in value;

  return isInstance;
}

export function CloseExemptionResponseContentFromJSON(json: any): CloseExemptionResponseContent {
  return CloseExemptionResponseContentFromJSONTyped(json, false);
}

export function CloseExemptionResponseContentFromJSONTyped(
  json: any,
  _ignoreDiscriminator: boolean,
): CloseExemptionResponseContent {
  if (json === undefined || json === null) {
    return json;
  }

  return {
    question: !exists(json, 'question') ? undefined : ChatMessageFromJSON(json['question']),
    answer: !exists(json, 'answer') ? undefined : ChatMessageFromJSON(json['answer']),
    sources: !exists(json, 'sources') ? undefined : (json['sources'] as Array<any>).map(ChatMessageSourceFromJSON),
    traceData: !exists(json, 'traceData') ? undefined : json['traceData'],
  };
}

export function CloseExemptionResponseContentToJSON(value?: CloseExemptionResponseContent | null): any {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }

  return {
    question: value.question === undefined ? undefined : ChatMessageToJSON(value.question),
    answer: value.answer === undefined ? undefined : ChatMessageToJSON(value.answer),
    sources: value.sources === undefined ? undefined : value.sources.map(ChatMessageSourceToJSON),
    traceData: value.traceData,
  };
}
