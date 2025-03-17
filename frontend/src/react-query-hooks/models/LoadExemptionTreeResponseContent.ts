/* tslint:disable */
/* eslint-disable */
import { exists } from '../runtime';

/**
 *
 * @export
 * @interface LoadExemptionTreeResponseContent
 */
export interface LoadExemptionTreeResponseContent {
  /**
   *
   * @type {string}
   * @memberof LoadExemptionTreeResponseContent
   */
  decisionTree: string | null;
}

/**
 * Check if a given object implements the LoadExemptionTreeResponseContent interface.
 */
export function instanceOfLoadExemptionTreeResponseContent(_value: object): boolean {
  if (_value === null || _value === undefined) return false;

  let isInstance = true;
  isInstance = isInstance && 'decisionTree' in _value;

  return isInstance;
}

export function LoadExemptionTreeResponseContentFromJSON(json: any): LoadExemptionTreeResponseContent {
  return LoadExemptionTreeResponseFromJSONTyped(json, false);
}

export function LoadExemptionTreeResponseFromJSONTyped(
  json: any,
  _ignoreDiscriminator: boolean,
): LoadExemptionTreeResponseContent {
  if (json === null || json === undefined) {
    return json;
  }
  return {
    decisionTree: !exists(json, 'decisionTree') ? undefined : json['decisionTree'],
  };
}

export function LoadExemptionTreeResponseContentToJSON(value?: LoadExemptionTreeResponseContent | null): any {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return {
    decisionTree: value.decisionTree,
  };
}
