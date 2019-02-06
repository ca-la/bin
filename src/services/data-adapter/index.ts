import * as _ from 'lodash';

export type KeyTransformer = (a: string) => string;
export type DataTransformer<A, B> = (a: A) => B;

export default class DataAdapter<RowData extends object, UserData> {
  constructor(
    private encodeTransformer: DataTransformer<RowData, UserData> = defaultEncoder,
    private decodeTransformer: DataTransformer<UserData, RowData> = defaultDecoder,
    private insertionTransformer: DataTransformer<
      Uninserted<UserData>,
      Uninserted<RowData>
    > = defaultDecoder
  ) {}

  public parse(rowData: RowData): UserData {
    return this.encodeTransformer(rowData);
  }

  public toDb(userData: UserData): RowData {
    return this.decodeTransformer(userData);
  }

  public forInsertion(userData: Uninserted<UserData>): Uninserted<RowData> {
    return this.insertionTransformer(userData);
  }
}

function defaultEncoder<A, B>(source: A): B {
  return transformKeys(camelize, source);
}

function defaultDecoder<A, B>(source: A): B {
  return transformKeys(snakify, source);
}

function transformKeys(keyTransformer: KeyTransformer, source: any): any {
  if (_.isArray(source)) {
    return source.map(
      (value: any): any => {
        if (_.isArray(value) || _.isObject(value)) {
          return transformKeys(keyTransformer, value);
        }

        return value;
      }
    );
  }

  if (_.isObject(source)) {
    return _.reduce(
      source,
      (acc: any, value: any, key: any): any => {
        let val: any = value;
        if (_.isArray(value) || _.isPlainObject(value)) {
          val = transformKeys(keyTransformer, value);
        }

        const transformed = keyTransformer(key);
        return Object.assign(
          {},
          acc,
          { [transformed]: val }
        );
      },
      undefined
    );
  }

  return source;
}

export function camelize(snakeCase: string): string {
  return snakeCase.replace(/(_\w)/g, (m: string) => m[1].toUpperCase());
}

export function snakify(camelCase: string): string {
  return camelCase.replace(/([a-z0-9][A-Z0-9])/g, (m: string) => m[0] + '_' + m[1].toLowerCase());
}
