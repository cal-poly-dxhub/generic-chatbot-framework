/* tslint:disable */
/* eslint-disable */
/**
 * 
 * @export
 * @interface ChatCostResponseContent
 */
export interface ChatCostResponseContent {
    userCost: number;
    totalCost: number;
    assistantCost: number;
}

/**
 * Check if a given object implements the ChatCostResponseContent interface.
 */
export function instanceOfChatCostResponseContent(value: object): boolean {
    return "userCost" in value && "totalCost" in value && "assistantCost" in value;
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
        userCost: Number(json['user_cost']),
        totalCost: Number(json['total_cost']),
        assistantCost: Number(json['assistant_cost']),
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
        user_cost: value.userCost,
        total_cost: value.totalCost,
        assistant_cost: value.assistantCost,
    };
}
