/* tslint:disable */
/* eslint-disable */
/**
 * Create a chat session for a user
 * @export
 * @interface CreateChatRequestContent
 */
export interface CreateChatRequestContent {
    /**
     * 
     * @type {string}
     * @memberof CreateChatRequestContent
     */
    title: string;
}


/**
 * Check if a given object implements the CreateChatRequestContent interface.
 */
export function instanceOfCreateChatRequestContent(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "title" in value;

    return isInstance;
}

export function CreateChatRequestContentFromJSON(json: any): CreateChatRequestContent {
    return CreateChatRequestContentFromJSONTyped(json, false);
}

export function CreateChatRequestContentFromJSONTyped(json: any, _ignoreDiscriminator: boolean): CreateChatRequestContent {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'title': json['title'],
    };
}

export function CreateChatRequestContentToJSON(value?: CreateChatRequestContent | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'title': value.title,
    };
}

