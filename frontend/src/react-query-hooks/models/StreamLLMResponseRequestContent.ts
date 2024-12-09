/* tslint:disable */
/* eslint-disable */
/**
 * 
 * @export
 * @interface StreamLLMResponseRequestContent
 */
export interface StreamLLMResponseRequestContent {
    /**
     * 
     * @type {string}
     * @memberof StreamLLMResponseRequestContent
     */
    chatId: string;
    /**
     * 
     * @type {string}
     * @memberof StreamLLMResponseRequestContent
     */
    messageId: string;
    /**
     * 
     * @type {Array<string>}
     * @memberof StreamLLMResponseRequestContent
     */
    chunks: Array<string>;
}


/**
 * Check if a given object implements the StreamLLMResponseRequestContent interface.
 */
export function instanceOfStreamLLMResponseRequestContent(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "chatId" in value;
    isInstance = isInstance && "messageId" in value;
    isInstance = isInstance && "chunks" in value;

    return isInstance;
}

export function StreamLLMResponseRequestContentFromJSON(json: any): StreamLLMResponseRequestContent {
    return StreamLLMResponseRequestContentFromJSONTyped(json, false);
}

export function StreamLLMResponseRequestContentFromJSONTyped(json: any, _ignoreDiscriminator: boolean): StreamLLMResponseRequestContent {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'chatId': json['chatId'],
        'messageId': json['messageId'],
        'chunks': json['chunks'],
    };
}

export function StreamLLMResponseRequestContentToJSON(value?: StreamLLMResponseRequestContent | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'chatId': value.chatId,
        'messageId': value.messageId,
        'chunks': value.chunks,
    };
}

