/* tslint:disable */
/* eslint-disable */
/**
 * 
 * @export
 * @interface DeleteChatResponseContent
 */
export interface DeleteChatResponseContent {
    /**
     * 
     * @type {string}
     * @memberof DeleteChatResponseContent
     */
    chatId: string;
}


/**
 * Check if a given object implements the DeleteChatResponseContent interface.
 */
export function instanceOfDeleteChatResponseContent(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "chatId" in value;

    return isInstance;
}

export function DeleteChatResponseContentFromJSON(json: any): DeleteChatResponseContent {
    return DeleteChatResponseContentFromJSONTyped(json, false);
}

export function DeleteChatResponseContentFromJSONTyped(json: any, _ignoreDiscriminator: boolean): DeleteChatResponseContent {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'chatId': json['chatId'],
    };
}

export function DeleteChatResponseContentToJSON(value?: DeleteChatResponseContent | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'chatId': value.chatId,
    };
}

