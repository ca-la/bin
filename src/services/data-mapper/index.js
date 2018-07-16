'use strict';

const invert = require('lodash/invert');
const mapKeys = require('lodash/mapKeys');

const { logServerError } = require('../logger');
const InvalidDataError = require('../../errors/invalid-data');

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
      if (!columnName) {
        logServerError('Column names by key name:');
        logServerError(JSON.stringify(this.columnNamesByKeyName, null, 2));
        throw new InvalidDataError(`Unknown key: ${key}`);
      }
      return columnName;
    });
  }

  rowDataToUserData(data) {
    return mapKeys(data, (value, key) => {
      const keyName = this.keyNamesByColumnName[key];

      if (!keyName) {
        // Not "breaking" since we basically just got back some extra data from
        // the DB, but still not intended.
        logServerError(`Undefined key name: ${key}`);
        return key;
      }

      return keyName;
    });
  }

  getKeyName(columnName) {
    return this.keyNamesByColumnName[columnName];
  }
}

module.exports = DataMapper;
