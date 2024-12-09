/* tslint:disable */
/* eslint-disable */
/**
 * An error due to the client attempting to access a missing resource
 * @export
 * @interface NotFoundErrorResponseContent
 */
export interface NotFoundErrorResponseContent {
    /**
     * Message with details about the error
     * @type {string}
     * @memberof NotFoundErrorResponseContent
     */
    errorMessage: string;
}


/**
 * Check if a given object implements the NotFoundErrorResponseContent interface.
 */
export function instanceOfNotFoundErrorResponseContent(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "errorMessage" in value;

    return isInstance;
}

export function NotFoundErrorResponseContentFromJSON(json: any): NotFoundErrorResponseContent {
    return NotFoundErrorResponseContentFromJSONTyped(json, false);
}

export function NotFoundErrorResponseContentFromJSONTyped(json: any, _ignoreDiscriminator: boolean): NotFoundErrorResponseContent {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'errorMessage': json['errorMessage'],
    };
}

export function NotFoundErrorResponseContentToJSON(value?: NotFoundErrorResponseContent | null): any {
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

