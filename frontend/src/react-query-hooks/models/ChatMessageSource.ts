/* tslint:disable */
/* eslint-disable */
/**
 * 
 * @export
 * @interface ChatMessageSource
 */
export interface ChatMessageSource {
    /**
     * 
     * @type {string}
     * @memberof ChatMessageSource
     */
    sourceId: string;
    /**
     * 
     * @type {string}
     * @memberof ChatMessageSource
     */
    pageContent: string;
    /**
     * A type for any object
     * @type {any}
     * @memberof ChatMessageSource
     */
    metadata: any | null;
    /**
     * 
     * @type {string}
     * @memberof ChatMessageSource
     */
    chatId: string;
    /**
     * 
     * @type {string}
     * @memberof ChatMessageSource
     */
    messageId: string;
}


/**
 * Check if a given object implements the ChatMessageSource interface.
 */
export function instanceOfChatMessageSource(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "sourceId" in value;
    isInstance = isInstance && "pageContent" in value;
    isInstance = isInstance && "metadata" in value;
    isInstance = isInstance && "chatId" in value;
    isInstance = isInstance && "messageId" in value;

    return isInstance;
}

export function ChatMessageSourceFromJSON(json: any): ChatMessageSource {
    return ChatMessageSourceFromJSONTyped(json, false);
}

export function ChatMessageSourceFromJSONTyped(json: any, _ignoreDiscriminator: boolean): ChatMessageSource {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'sourceId': json['sourceId'],
        'pageContent': json['pageContent'],
        'metadata': json['metadata'],
        'chatId': json['chatId'],
        'messageId': json['messageId'],
    };
}

export function ChatMessageSourceToJSON(value?: ChatMessageSource | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'sourceId': value.sourceId,
        'pageContent': value.pageContent,
        'metadata': value.metadata,
        'chatId': value.chatId,
        'messageId': value.messageId,
    };
}

