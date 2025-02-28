/* tslint:disable */
/* eslint-disable */
/**
 * 
 * @export
 * @interface ChatCostRequestContent
 */
export interface ChatCostRequestContent {
    chatId: string;
}

/**
 * Check if a given object implements the ChatCostRequestContent interface.
 */
export function instanceOfChatCostRequestContent(value: object): boolean {
    return "chatId" in value;
}

/**
 * Converts JSON to ChatCostRequestContent
 */
export function ChatCostRequestContentFromJSON(json: any): ChatCostRequestContent {
    return ChatCostRequestContentFromJSONTyped(json, false);
}

/**
 * Converts JSON to a strongly-typed ChatCostRequestContent
 */
export function ChatCostRequestContentFromJSONTyped(json: any, _ignoreDiscriminator: boolean): ChatCostRequestContent {
    if (json === undefined || json === null) {
        return json;
    }
    return {
        chatId: json['chatId'],
    };
}

/**
 * Converts ChatCostRequestContent to JSON
 */
export function ChatCostRequestContentToJSON(value?: ChatCostRequestContent | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        chatId: value.chatId,
    };
}