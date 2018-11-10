import * as _ from 'lodash';

export type KeyTransformer = (a: string) => string;

export default class DataAdapter<RowData extends object, UserData> {
  constructor(
    private encodeTransformer: KeyTransformer = camelize,
    private decodeTransformer: KeyTransformer = snakify
  ) {}

  public parse(rowData: RowData): UserData {
    return transformKeys(this.encodeTransformer, rowData) as UserData;
  }

  public toDb(userData: UserData): RowData {
    return transformKeys(this.decodeTransformer, userData) as RowData;
  }

  public forInsertion(userData: Uninserted<UserData>): Uninserted<RowData> {
    return transformKeys(this.decodeTransformer, userData) as Uninserted<RowData>;
  }
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
