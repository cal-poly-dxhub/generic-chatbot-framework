/* tslint:disable */
/* eslint-disable */
import { exists } from '../runtime';
/**
 * 
 * @export
 * @interface CreateChatResponseContent
 */
export interface CreateChatResponseContent {
    /**
     * 
     * @type {string}
     * @memberof CreateChatResponseContent
     */
    chatId: string;
    /**
     * 
     * @type {string}
     * @memberof CreateChatResponseContent
     */
    title: string;
    /**
     * 
     * @type {string}
     * @memberof CreateChatResponseContent
     */
    userId: string;
    /**
     * Timestamp as milliseconds from epoch
     * @type {number}
     * @memberof CreateChatResponseContent
     */
    createdAt?: number;
}


/**
 * Check if a given object implements the CreateChatResponseContent interface.
 */
export function instanceOfCreateChatResponseContent(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "chatId" in value;
    isInstance = isInstance && "title" in value;
    isInstance = isInstance && "userId" in value;

    return isInstance;
}

export function CreateChatResponseContentFromJSON(json: any): CreateChatResponseContent {
    return CreateChatResponseContentFromJSONTyped(json, false);
}

export function CreateChatResponseContentFromJSONTyped(json: any, _ignoreDiscriminator: boolean): CreateChatResponseContent {
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

export function CreateChatResponseContentToJSON(value?: CreateChatResponseContent | null): any {
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

