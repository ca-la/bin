'use strict';

const omitBy = require('lodash/omitBy');

function compact(obj) {
  return omitBy(obj, val => val === undefined);
}

module.exports = compact;
