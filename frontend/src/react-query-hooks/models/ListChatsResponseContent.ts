/* tslint:disable */
/* eslint-disable */
import { exists } from '../runtime';
import type { Chat } from './Chat';
import {
    ChatFromJSON,
    ChatToJSON,
} from './Chat';

/**
 * 
 * @export
 * @interface ListChatsResponseContent
 */
export interface ListChatsResponseContent {
    /**
     * 
     * @type {Array<Chat>}
     * @memberof ListChatsResponseContent
     */
    chats?: Array<Chat>;
}


/**
 * Check if a given object implements the ListChatsResponseContent interface.
 */
export function instanceOfListChatsResponseContent(_value: object): boolean {
    let isInstance = true;

    return isInstance;
}

export function ListChatsResponseContentFromJSON(json: any): ListChatsResponseContent {
    return ListChatsResponseContentFromJSONTyped(json, false);
}

export function ListChatsResponseContentFromJSONTyped(json: any, _ignoreDiscriminator: boolean): ListChatsResponseContent {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'chats': !exists(json, 'chats') ? undefined : ((json['chats'] as Array<any>).map(ChatFromJSON)),
    };
}

export function ListChatsResponseContentToJSON(value?: ListChatsResponseContent | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'chats': value.chats === undefined ? undefined : ((value.chats as Array<any>).map(ChatToJSON)),
    };
}

