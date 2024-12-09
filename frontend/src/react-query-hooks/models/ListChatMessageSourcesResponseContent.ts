/* tslint:disable */
/* eslint-disable */
import { exists } from '../runtime';
import type { ChatMessageSource } from './ChatMessageSource';
import {
    ChatMessageSourceFromJSON,
    ChatMessageSourceToJSON,
} from './ChatMessageSource';

/**
 * Extends outputs for "list" type operations to return pagination details
 * @export
 * @interface ListChatMessageSourcesResponseContent
 */
export interface ListChatMessageSourcesResponseContent {
    /**
     * Pass this in the next request for another page of results
     * @type {string}
     * @memberof ListChatMessageSourcesResponseContent
     */
    nextToken?: string;
    /**
     * 
     * @type {Array<ChatMessageSource>}
     * @memberof ListChatMessageSourcesResponseContent
     */
    chatMessageSources?: Array<ChatMessageSource>;
}


/**
 * Check if a given object implements the ListChatMessageSourcesResponseContent interface.
 */
export function instanceOfListChatMessageSourcesResponseContent(_value: object): boolean {
    let isInstance = true;

    return isInstance;
}

export function ListChatMessageSourcesResponseContentFromJSON(json: any): ListChatMessageSourcesResponseContent {
    return ListChatMessageSourcesResponseContentFromJSONTyped(json, false);
}

export function ListChatMessageSourcesResponseContentFromJSONTyped(json: any, _ignoreDiscriminator: boolean): ListChatMessageSourcesResponseContent {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'nextToken': !exists(json, 'nextToken') ? undefined : json['nextToken'],
        'chatMessageSources': !exists(json, 'chatMessageSources') ? undefined : ((json['chatMessageSources'] as Array<any>).map(ChatMessageSourceFromJSON)),
    };
}

export function ListChatMessageSourcesResponseContentToJSON(value?: ListChatMessageSourcesResponseContent | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'nextToken': value.nextToken,
        'chatMessageSources': value.chatMessageSources === undefined ? undefined : ((value.chatMessageSources as Array<any>).map(ChatMessageSourceToJSON)),
    };
}

