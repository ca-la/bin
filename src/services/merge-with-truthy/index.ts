import { mergeWith } from "lodash";

export function mergeWithTruthy<T extends object>(target: T, source: T): T {
  return mergeWith(
    Object.assign({}, target),
    source,
    (value: any, sourceValue: any): any => value || sourceValue
  );
}
