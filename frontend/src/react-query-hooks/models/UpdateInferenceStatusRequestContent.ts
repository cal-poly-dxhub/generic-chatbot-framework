/* tslint:disable */
/* eslint-disable */

import { exists } from '../runtime';
/**
 * 
 * @export
 * @interface UpdateInferenceStatusRequestContent
 */
export interface UpdateInferenceStatusRequestContent {
    /**
     * 
     * @type {string}
     * @memberof UpdateInferenceStatusRequestContent
     */
    chatId: string;
    /**
     * 
     * @type {string}
     * @memberof UpdateInferenceStatusRequestContent
     */
    messageId: string;
    /**
     * 
     * @type {string}
     * @memberof UpdateInferenceStatusRequestContent
     */
    operation: string;
    /**
     * Timestamp as milliseconds from epoch
     * @type {number}
     * @memberof UpdateInferenceStatusRequestContent
     */
    updatedAt: number;
    /**
     * 
     * @type {string}
     * @memberof UpdateInferenceStatusRequestContent
     */
    status?: string;
    /**
     * A type for any object
     * @type {any}
     * @memberof UpdateInferenceStatusRequestContent
     */
    payload?: any | null;
}


/**
 * Check if a given object implements the UpdateInferenceStatusRequestContent interface.
 */
export function instanceOfUpdateInferenceStatusRequestContent(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "chatId" in value;
    isInstance = isInstance && "messageId" in value;
    isInstance = isInstance && "operation" in value;
    isInstance = isInstance && "updatedAt" in value;

    return isInstance;
}

export function UpdateInferenceStatusRequestContentFromJSON(json: any): UpdateInferenceStatusRequestContent {
    return UpdateInferenceStatusRequestContentFromJSONTyped(json, false);
}

export function UpdateInferenceStatusRequestContentFromJSONTyped(json: any, _ignoreDiscriminator: boolean): UpdateInferenceStatusRequestContent {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'chatId': json['chatId'],
        'messageId': json['messageId'],
        'operation': json['operation'],
        'updatedAt': json['updatedAt'],
        'status': !exists(json, 'status') ? undefined : json['status'],
        'payload': !exists(json, 'payload') ? undefined : json['payload'],
    };
}

export function UpdateInferenceStatusRequestContentToJSON(value?: UpdateInferenceStatusRequestContent | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'chatId': value.chatId,
        'messageId': value.messageId,
        'operation': value.operation,
        'updatedAt': value.updatedAt,
        'status': value.status,
        'payload': value.payload,
    };
}

