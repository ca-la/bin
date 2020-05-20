"use strict";

const omitBy = require("lodash/omitBy");
const isUndefined = require("lodash/isUndefined");
const partialRight = require("lodash/partialRight");

module.exports = partialRight(omitBy, isUndefined);
