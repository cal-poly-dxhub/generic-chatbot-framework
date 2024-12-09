/* tslint:disable */
/* eslint-disable */
/**
 * An error due to the client not being authorized to access the resource
 * @export
 * @interface NotAuthorizedErrorResponseContent
 */
export interface NotAuthorizedErrorResponseContent {
    /**
     * Message with details about the error
     * @type {string}
     * @memberof NotAuthorizedErrorResponseContent
     */
    errorMessage: string;
}


/**
 * Check if a given object implements the NotAuthorizedErrorResponseContent interface.
 */
export function instanceOfNotAuthorizedErrorResponseContent(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "errorMessage" in value;

    return isInstance;
}

export function NotAuthorizedErrorResponseContentFromJSON(json: any): NotAuthorizedErrorResponseContent {
    return NotAuthorizedErrorResponseContentFromJSONTyped(json, false);
}

export function NotAuthorizedErrorResponseContentFromJSONTyped(json: any, _ignoreDiscriminator: boolean): NotAuthorizedErrorResponseContent {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'errorMessage': json['errorMessage'],
    };
}

export function NotAuthorizedErrorResponseContentToJSON(value?: NotAuthorizedErrorResponseContent | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'errorMessage': value.errorMessage,
    };
}

