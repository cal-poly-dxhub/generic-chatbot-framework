/* tslint:disable */
/* eslint-disable */
/**
 * A temporary failure at the fault of the server
 * @export
 * @interface ServerTemporaryErrorResponseContent
 */
export interface ServerTemporaryErrorResponseContent {
    /**
     * Message with details about the error
     * @type {string}
     * @memberof ServerTemporaryErrorResponseContent
     */
    errorMessage: string;
}


/**
 * Check if a given object implements the ServerTemporaryErrorResponseContent interface.
 */
export function instanceOfServerTemporaryErrorResponseContent(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "errorMessage" in value;

    return isInstance;
}

export function ServerTemporaryErrorResponseContentFromJSON(json: any): ServerTemporaryErrorResponseContent {
    return ServerTemporaryErrorResponseContentFromJSONTyped(json, false);
}

export function ServerTemporaryErrorResponseContentFromJSONTyped(json: any, _ignoreDiscriminator: boolean): ServerTemporaryErrorResponseContent {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'errorMessage': json['errorMessage'],
    };
}

export function ServerTemporaryErrorResponseContentToJSON(value?: ServerTemporaryErrorResponseContent | null): any {
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

