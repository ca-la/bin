import { invert, mapKeys } from 'lodash';

import { logServerError } from '../logger';
import InvalidDataError = require('../../errors/invalid-data');

/**
 * Useful helpers for converting back and forth between userland data formats
 * and the database structure itself.
 *
 * @param {Object} keyNamesByColumnName e.g.
 * {
 *   full_name: 'fullName',
 *   db_column_name: 'niceAndFriendlyName'
 * }
 */
export interface ColumnObjectPropMap {
  [dbKey: string]: string;
}
export interface ObjectPropColumnMap {
  [objectProp: string]: string;
}

class DataMapper<UserData extends object, RowData extends object> {
  public keyNamesByColumnName: ColumnObjectPropMap;
  public columnNamesByKeyName: ObjectPropColumnMap;

  constructor(keyNamesByColumnName: ColumnObjectPropMap) {
    this.keyNamesByColumnName = keyNamesByColumnName;
    this.columnNamesByKeyName = invert(keyNamesByColumnName);
  }

  public userDataToRowData(data: UserData): RowData {
    return mapKeys(data, (_: any, key: string) => {
      const columnName = this.columnNamesByKeyName[key];
      if (!columnName) {
        logServerError('Column names by key name:');
        logServerError(JSON.stringify(this.columnNamesByKeyName, null, 2));
        throw new InvalidDataError(`Unknown key: ${key}`);
      }
      return columnName;
    }) as RowData;
  }

  public rowDataToUserData(data: RowData): UserData {
    return mapKeys(data, (_: any, key: string) => {
      const keyName = this.keyNamesByColumnName[key];

      if (!keyName) {
        // Not "breaking" since we basically just got back some extra data from
        // the DB, but still not intended.
        logServerError(`Undefined key name: ${key}`);
        return key;
      }

      return keyName;
    }) as UserData;
  }

  public getKeyName(columnName: string): string {
    return this.keyNamesByColumnName[columnName];
  }
}

export default DataMapper;
