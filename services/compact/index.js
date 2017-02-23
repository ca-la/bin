const omitBy = require('lodash/omitby');

function compact(obj) {
  return omitBy(obj, val => val === undefined);
}

module.exports = compact;
