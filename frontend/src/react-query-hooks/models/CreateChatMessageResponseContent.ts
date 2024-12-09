/* tslint:disable */
/* eslint-disable */
import { exists } from '../runtime';
import type { ChatMessage } from './ChatMessage';
import {
    ChatMessageFromJSON,
    ChatMessageToJSON,
} from './ChatMessage';
import type { ChatMessageSource } from './ChatMessageSource';
import {
    ChatMessageSourceFromJSON,
    ChatMessageSourceToJSON,
} from './ChatMessageSource';

/**
 * 
 * @export
 * @interface CreateChatMessageResponseContent
 */
export interface CreateChatMessageResponseContent {
    /**
     * 
     * @type {ChatMessage}
     * @memberof CreateChatMessageResponseContent
     */
    question: ChatMessage;
    /**
     * 
     * @type {ChatMessage}
     * @memberof CreateChatMessageResponseContent
     */
    answer: ChatMessage;
    /**
     * 
     * @type {Array<ChatMessageSource>}
     * @memberof CreateChatMessageResponseContent
     */
    sources?: Array<ChatMessageSource>;
    /**
     * A type for any object
     * @type {any}
     * @memberof CreateChatMessageResponseContent
     */
    traceData?: any | null;
}


/**
 * Check if a given object implements the CreateChatMessageResponseContent interface.
 */
export function instanceOfCreateChatMessageResponseContent(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "question" in value;
    isInstance = isInstance && "answer" in value;

    return isInstance;
}

export function CreateChatMessageResponseContentFromJSON(json: any): CreateChatMessageResponseContent {
    return CreateChatMessageResponseContentFromJSONTyped(json, false);
}

export function CreateChatMessageResponseContentFromJSONTyped(json: any, _ignoreDiscriminator: boolean): CreateChatMessageResponseContent {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'question': ChatMessageFromJSON(json['question']),
        'answer': ChatMessageFromJSON(json['answer']),
        'sources': !exists(json, 'sources') ? undefined : ((json['sources'] as Array<any>).map(ChatMessageSourceFromJSON)),
        'traceData': !exists(json, 'traceData') ? undefined : json['traceData'],
    };
}

export function CreateChatMessageResponseContentToJSON(value?: CreateChatMessageResponseContent | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'question': ChatMessageToJSON(value.question),
        'answer': ChatMessageToJSON(value.answer),
        'sources': value.sources === undefined ? undefined : ((value.sources as Array<any>).map(ChatMessageSourceToJSON)),
        'traceData': value.traceData,
    };
}

