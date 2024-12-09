/* tslint:disable */
/* eslint-disable */
/**
 * An internal failure at the fault of the server
 * @export
 * @interface ServerErrorResponseContent
 */
export interface ServerErrorResponseContent {
    /**
     * Message with details about the error
     * @type {string}
     * @memberof ServerErrorResponseContent
     */
    errorMessage: string;
}


/**
 * Check if a given object implements the ServerErrorResponseContent interface.
 */
export function instanceOfServerErrorResponseContent(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "errorMessage" in value;

    return isInstance;
}

export function ServerErrorResponseContentFromJSON(json: any): ServerErrorResponseContent {
    return ServerErrorResponseContentFromJSONTyped(json, false);
}

export function ServerErrorResponseContentFromJSONTyped(json: any, _ignoreDiscriminator: boolean): ServerErrorResponseContent {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'errorMessage': json['errorMessage'],
    };
}

export function ServerErrorResponseContentToJSON(value?: ServerErrorResponseContent | null): any {
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

