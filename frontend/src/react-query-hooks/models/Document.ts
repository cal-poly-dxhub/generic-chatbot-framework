/* tslint:disable */
/* eslint-disable */
import { exists } from '../runtime';
/**
 * 
 * @export
 * @interface Document
 */
export interface Document {
    /**
     * 
     * @type {string}
     * @memberof Document
     */
    pageContent: string;
    /**
     * A type for any object
     * @type {any}
     * @memberof Document
     */
    metadata: any | null;
    /**
     * 
     * @type {number}
     * @memberof Document
     */
    score?: number;
}


/**
 * Check if a given object implements the Document interface.
 */
export function instanceOfDocument(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "pageContent" in value;
    isInstance = isInstance && "metadata" in value;

    return isInstance;
}

export function DocumentFromJSON(json: any): Document {
    return DocumentFromJSONTyped(json, false);
}

export function DocumentFromJSONTyped(json: any, _ignoreDiscriminator: boolean): Document {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'pageContent': json['pageContent'],
        'metadata': json['metadata'],
        'score': !exists(json, 'score') ? undefined : json['score'],
    };
}

export function DocumentToJSON(value?: Document | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'pageContent': value.pageContent,
        'metadata': value.metadata,
        'score': value.score,
    };
}

