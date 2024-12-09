/* tslint:disable */
/* eslint-disable */
/**
 * 
 * @export
 * @interface CreateChatMessageRequestContent
 */
export interface CreateChatMessageRequestContent {
    /**
     * 
     * @type {string}
     * @memberof CreateChatMessageRequestContent
     */
    question: string;
}


/**
 * Check if a given object implements the CreateChatMessageRequestContent interface.
 */
export function instanceOfCreateChatMessageRequestContent(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "question" in value;

    return isInstance;
}

export function CreateChatMessageRequestContentFromJSON(json: any): CreateChatMessageRequestContent {
    return CreateChatMessageRequestContentFromJSONTyped(json, false);
}

export function CreateChatMessageRequestContentFromJSONTyped(json: any, _ignoreDiscriminator: boolean): CreateChatMessageRequestContent {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'question': json['question'],
    };
}

export function CreateChatMessageRequestContentToJSON(value?: CreateChatMessageRequestContent | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        'question': value.question,
    };
}

