/* tslint:disable */
/* eslint-disable */
/**
 * 
 * @export
 * @enum {string}
 */
export type MessageType =
  'human' | 
  'ai' | 
  'system' | 
  'chat'


export function MessageTypeFromJSON(json: any): MessageType {
    return MessageTypeFromJSONTyped(json, false);
}

export function MessageTypeFromJSONTyped(json: any, _ignoreDiscriminator: boolean): MessageType {
    return json as MessageType;
}

export function MessageTypeToJSON(value?: MessageType | null): any {
    return value as any;
}

