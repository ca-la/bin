import { isEqual } from 'lodash';

// https://stackoverflow.com/a/40610459/990783
interface Arg {
  [key: string]: any;
}
export const getObjectDiff = <T extends Arg>(
  obj1: Arg,
  obj2: Arg
): (keyof T)[] => {
  return Object.keys(obj1).reduce((result: string[], key: string) => {
    if (!obj2.hasOwnProperty(key)) {
      result.push(key);
    } else if (isEqual(obj1[key], obj2[key])) {
      const resultKeyIndex = result.indexOf(key);
      result.splice(resultKeyIndex, 1);
    }
    return result;
  }, Object.keys(obj2));
};
