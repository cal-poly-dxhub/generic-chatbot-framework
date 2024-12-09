/* tslint:disable */
/* eslint-disable */
import { exists } from '../runtime';
import type { ChatMessage } from './ChatMessage';
import {
    ChatMessageFromJSON,
    ChatMessageToJSON,
} from './ChatMessage';

/**
 * Extends outputs for "list" type operations to return pagination details
 * @export
 * @interface ListChatMessagesResponseContent
 */
export interface ListChatMessagesResponseContent {
    /**
     * Pass this in the next request for another page of results
     * @type {string}
     * @memberof ListChatMessagesResponseContent
     */
    nextToken?: string;
    /**
     * 
     * @type {Array<ChatMessage>}
     * @memberof ListChatMessagesResponseContent
     */
    chatMessages?: Array<ChatMessage>;
}


/**
 * Check if a given object implements the ListChatMessagesResponseContent interface.
 */
export function instanceOfListChatMessagesResponseContent(_value: object): boolean {
    let isInstance = true;

    return isInstance;
}

export function ListChatMessagesResponseContentFromJSON(json: any): ListChatMessagesResponseContent {
    return ListChatMessagesResponseContentFromJSONTyped(json, false);
}

export function ListChatMessagesResponseContentFromJSONTyped(json: any, _ignoreDiscriminator: boolean): ListChatMessagesResponseContent {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'nextToken': !exists(json, 'nextToken') ? undefined : json['nextToken'],
        'chatMessages': !exists(json, 'chatMessages') ? undefined : ((json['chatMessages'] as Array<any>).map(ChatMessageFromJSON)),
    };
}

export function ListChatMessagesResponseContentToJSON(value?: ListChatMessagesResponseContent | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'nextToken': value.nextToken,
        'chatMessages': value.chatMessages === undefined ? undefined : ((value.chatMessages as Array<any>).map(ChatMessageToJSON)),
    };
}

