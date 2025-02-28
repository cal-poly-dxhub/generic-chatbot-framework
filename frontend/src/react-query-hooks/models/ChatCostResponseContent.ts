/* tslint:disable */
/* eslint-disable */
/**
 * 
 * @export
 * @interface ChatCostResponseContent
 */
export interface ChatCostResponseContent {
    totalTokens: number;
    cost: number;
    currency: string;
}

/**
 * Check if a given object implements the ChatCostResponseContent interface.
 */
export function instanceOfChatCostResponseContent(value: object): boolean {
    return "totalTokens" in value && "cost" in value && "currency" in value;
}

/**
 * Converts JSON to ChatCostResponseContent
 */
export function ChatCostResponseContentFromJSON(json: any): ChatCostResponseContent {
    return ChatCostResponseContentFromJSONTyped(json, false);
}

/**
 * Converts JSON to a strongly-typed ChatCostResponseContent
 */
export function ChatCostResponseContentFromJSONTyped(json: any, _ignoreDiscriminator: boolean): ChatCostResponseContent {
    if (json === undefined || json === null) {
        return json;
    }
    return {
        totalTokens: json['totalTokens'],
        cost: json['cost'],
        currency: json['currency'],
    };
}

/**
 * Converts ChatCostResponseContent to JSON
 */
export function ChatCostResponseContentToJSON(value?: ChatCostResponseContent | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        totalTokens: value.totalTokens,
        cost: value.cost,
        currency: value.currency,
    };
}