/* tslint:disable */
/* eslint-disable */
/**
 * 
 * @export
 * @interface UpdateChatRequestContent
 */
export interface UpdateChatRequestContent {
    /**
     * 
     * @type {string}
     * @memberof UpdateChatRequestContent
     */
    title: string;
}


/**
 * Check if a given object implements the UpdateChatRequestContent interface.
 */
export function instanceOfUpdateChatRequestContent(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "title" in value;

    return isInstance;
}

export function UpdateChatRequestContentFromJSON(json: any): UpdateChatRequestContent {
    return UpdateChatRequestContentFromJSONTyped(json, false);
}

export function UpdateChatRequestContentFromJSONTyped(json: any, _ignoreDiscriminator: boolean): UpdateChatRequestContent {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'title': json['title'],
    };
}

export function UpdateChatRequestContentToJSON(value?: UpdateChatRequestContent | null): any {
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

