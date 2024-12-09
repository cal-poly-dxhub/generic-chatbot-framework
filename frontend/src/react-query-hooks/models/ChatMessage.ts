/* tslint:disable */
/* eslint-disable */
import type { MessageType } from './MessageType';
import {
    MessageTypeFromJSON,
    MessageTypeToJSON,
} from './MessageType';

/**
 * 
 * @export
 * @interface ChatMessage
 */
export interface ChatMessage {
    /**
     * 
     * @type {string}
     * @memberof ChatMessage
     */
    chatId: string;
    /**
     * 
     * @type {string}
     * @memberof ChatMessage
     */
    messageId: string;
    /**
     * 
     * @type {string}
     * @memberof ChatMessage
     */
    text: string;
    /**
     * Timestamp as milliseconds from epoch
     * @type {number}
     * @memberof ChatMessage
     */
    createdAt: number;
    /**
     * 
     * @type {MessageType}
     * @memberof ChatMessage
     */
    type: MessageType;
}


/**
 * Check if a given object implements the ChatMessage interface.
 */
export function instanceOfChatMessage(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "chatId" in value;
    isInstance = isInstance && "messageId" in value;
    isInstance = isInstance && "text" in value;
    isInstance = isInstance && "createdAt" in value;
    isInstance = isInstance && "type" in value;

    return isInstance;
}

export function ChatMessageFromJSON(json: any): ChatMessage {
    return ChatMessageFromJSONTyped(json, false);
}

export function ChatMessageFromJSONTyped(json: any, _ignoreDiscriminator: boolean): ChatMessage {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'chatId': json['chatId'],
        'messageId': json['messageId'],
        'text': json['text'],
        'createdAt': json['createdAt'],
        'type': MessageTypeFromJSON(json['type']),
    };
}

export function ChatMessageToJSON(value?: ChatMessage | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'chatId': value.chatId,
        'messageId': value.messageId,
        'text': value.text,
        'createdAt': value.createdAt,
        'type': MessageTypeToJSON(value.type),
    };
}

