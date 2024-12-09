/* tslint:disable */
/* eslint-disable */
/**
 * A generic structure for maps that are indexed by a string and hold String value
 * @export
 * @interface StringMap
 */
export interface StringMap {
    [key: string]: string;
}


/**
 * Check if a given object implements the StringMap interface.
 */
export function instanceOfStringMap(_value: object): boolean {
    let isInstance = true;

    return isInstance;
}

export function StringMapFromJSON(json: any): StringMap {
    return StringMapFromJSONTyped(json, false);
}

export function StringMapFromJSONTyped(json: any, _ignoreDiscriminator: boolean): StringMap {
    return json;
}

export function StringMapToJSON(value?: StringMap | null): any {
    return value;
}

