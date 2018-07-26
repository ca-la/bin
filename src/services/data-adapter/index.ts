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
}

function transformKeys(keyTransformer: KeyTransformer, source: any): any {
  if (_.isArray(source) || _.isPlainObject(source)) {
    return _.reduce(
      source,
      (acc: any, value: any, key: any): any => {
        let val: any = value;
        if (_.isArray(value) || _.isPlainObject(value)) {
          val = transformKeys(keyTransformer, value);
        }

        return Object.assign(
          {},
          acc,
          { [keyTransformer(key)]: val }
        );
      },
      undefined
    );
  }

  return source;
}

function camelize(snakeCase: string): string {
  return snakeCase.replace(/(_\w)/g, (m: string) => m[1].toUpperCase());
}

function snakify(camelCase: string): string {
  return camelCase.replace(/([a-z0-9][A-Z0-9])/g, (m: string) => m[0] + '_' + m[1].toLowerCase());
}
