/* tslint:disable */
/* eslint-disable */
/**
 * A generic structure for maps that are indexed by a string and hold Any value
 * @export
 * @interface StringAnyMap
 */
export interface StringAnyMap {
    [key: string]: any;
}


/**
 * Check if a given object implements the StringAnyMap interface.
 */
export function instanceOfStringAnyMap(_value: object): boolean {
    let isInstance = true;

    return isInstance;
}

export function StringAnyMapFromJSON(json: any): StringAnyMap {
    return StringAnyMapFromJSONTyped(json, false);
}

export function StringAnyMapFromJSONTyped(json: any, _ignoreDiscriminator: boolean): StringAnyMap {
    return json;
}

export function StringAnyMapToJSON(value?: StringAnyMap | null): any {
    return value;
}

