/* tslint:disable */
/* eslint-disable */
/**
 * An error at the fault of the client sending invalid input
 * @export
 * @interface ClientErrorResponseContent
 */
export interface ClientErrorResponseContent {
    /**
     * Message with details about the error
     * @type {string}
     * @memberof ClientErrorResponseContent
     */
    errorMessage: string;
}


/**
 * Check if a given object implements the ClientErrorResponseContent interface.
 */
export function instanceOfClientErrorResponseContent(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "errorMessage" in value;

    return isInstance;
}

export function ClientErrorResponseContentFromJSON(json: any): ClientErrorResponseContent {
    return ClientErrorResponseContentFromJSONTyped(json, false);
}

export function ClientErrorResponseContentFromJSONTyped(json: any, _ignoreDiscriminator: boolean): ClientErrorResponseContent {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'errorMessage': json['errorMessage'],
    };
}

export function ClientErrorResponseContentToJSON(value?: ClientErrorResponseContent | null): any {
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

