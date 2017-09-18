'use strict';

const invert = require('lodash/invert');
const mapKeys = require('lodash/mapKeys');

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
class DataMapper {
  constructor(keyNamesByColumnName) {
    this.keyNamesByColumnName = keyNamesByColumnName;
    this.columnNamesByKeyName = invert(keyNamesByColumnName);
  }

  userDataToRowData(data) {
    return mapKeys(data, (value, key) => {
      const columnName = this.columnNamesByKeyName[key];
      if (!columnName) throw new Error(`Undefined column name: ${key}`);
      return columnName;
    });
  }

  rowDataToUserData(data) {
    return mapKeys(data, (value, key) => {
      const keyName = this.keyNamesByColumnName[key];
      if (!keyName) throw new Error(`Undefined key name: ${key}`);
      return keyName;
    });
  }
}

module.exports = DataMapper;

