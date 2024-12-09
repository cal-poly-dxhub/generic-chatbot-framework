/* tslint:disable */
/* eslint-disable */
/**
 * 
 * @export
 * @enum {string}
 */
export type DistanceStrategy =
  'l2' | 
  'cosine' | 
  'inner'


export function DistanceStrategyFromJSON(json: any): DistanceStrategy {
    return DistanceStrategyFromJSONTyped(json, false);
}

export function DistanceStrategyFromJSONTyped(json: any, _ignoreDiscriminator: boolean): DistanceStrategy {
    return json as DistanceStrategy;
}

export function DistanceStrategyToJSON(value?: DistanceStrategy | null): any {
    return value as any;
}

