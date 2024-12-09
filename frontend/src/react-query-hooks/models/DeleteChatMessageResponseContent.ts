/* tslint:disable */
/* eslint-disable */
/**
 * 
 * @export
 * @interface DeleteChatMessageResponseContent
 */
export interface DeleteChatMessageResponseContent {
    /**
     * 
     * @type {string}
     * @memberof DeleteChatMessageResponseContent
     */
    chatId: string;
    /**
     * 
     * @type {string}
     * @memberof DeleteChatMessageResponseContent
     */
    messageId: string;
}


/**
 * Check if a given object implements the DeleteChatMessageResponseContent interface.
 */
export function instanceOfDeleteChatMessageResponseContent(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "chatId" in value;
    isInstance = isInstance && "messageId" in value;

    return isInstance;
}

export function DeleteChatMessageResponseContentFromJSON(json: any): DeleteChatMessageResponseContent {
    return DeleteChatMessageResponseContentFromJSONTyped(json, false);
}

export function DeleteChatMessageResponseContentFromJSONTyped(json: any, _ignoreDiscriminator: boolean): DeleteChatMessageResponseContent {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'chatId': json['chatId'],
        'messageId': json['messageId'],
    };
}

export function DeleteChatMessageResponseContentToJSON(value?: DeleteChatMessageResponseContent | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'chatId': value.chatId,
        'messageId': value.messageId,
    };
}

