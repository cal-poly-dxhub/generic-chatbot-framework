/* tslint:disable */
/* eslint-disable */
import { exists } from '../runtime';
/**
 * 
 * @export
 * @interface UpdateChatResponseContent
 */
export interface UpdateChatResponseContent {
    /**
     * 
     * @type {string}
     * @memberof UpdateChatResponseContent
     */
    chatId: string;
    /**
     * 
     * @type {string}
     * @memberof UpdateChatResponseContent
     */
    title: string;
    /**
     * 
     * @type {string}
     * @memberof UpdateChatResponseContent
     */
    userId: string;
    /**
     * Timestamp as milliseconds from epoch
     * @type {number}
     * @memberof UpdateChatResponseContent
     */
    createdAt?: number;
}


/**
 * Check if a given object implements the UpdateChatResponseContent interface.
 */
export function instanceOfUpdateChatResponseContent(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "chatId" in value;
    isInstance = isInstance && "title" in value;
    isInstance = isInstance && "userId" in value;

    return isInstance;
}

export function UpdateChatResponseContentFromJSON(json: any): UpdateChatResponseContent {
    return UpdateChatResponseContentFromJSONTyped(json, false);
}

export function UpdateChatResponseContentFromJSONTyped(json: any, _ignoreDiscriminator: boolean): UpdateChatResponseContent {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'chatId': json['chatId'],
        'title': json['title'],
        'userId': json['userId'],
        'createdAt': !exists(json, 'createdAt') ? undefined : json['createdAt'],
    };
}

export function UpdateChatResponseContentToJSON(value?: UpdateChatResponseContent | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'chatId': value.chatId,
        'title': value.title,
        'userId': value.userId,
        'createdAt': value.createdAt,
    };
}

