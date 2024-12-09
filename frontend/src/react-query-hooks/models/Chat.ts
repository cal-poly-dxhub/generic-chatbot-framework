/* tslint:disable */
/* eslint-disable */
import { exists } from '../runtime';
/**
 * 
 * @export
 * @interface Chat
 */
export interface Chat {
    /**
     * 
     * @type {string}
     * @memberof Chat
     */
    chatId: string;
    /**
     * 
     * @type {string}
     * @memberof Chat
     */
    title: string;
    /**
     * 
     * @type {string}
     * @memberof Chat
     */
    userId: string;
    /**
     * Timestamp as milliseconds from epoch
     * @type {number}
     * @memberof Chat
     */
    createdAt?: number;
}


/**
 * Check if a given object implements the Chat interface.
 */
export function instanceOfChat(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "chatId" in value;
    isInstance = isInstance && "title" in value;
    isInstance = isInstance && "userId" in value;

    return isInstance;
}

export function ChatFromJSON(json: any): Chat {
    return ChatFromJSONTyped(json, false);
}

export function ChatFromJSONTyped(json: any, _: boolean): Chat {
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

export function ChatToJSON(value?: Chat | null): any {
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

