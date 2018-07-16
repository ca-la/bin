'use strict';

const COLORS = require('../colors');

function log(...args) {
  // eslint-disable-next-line no-console
  console.log(COLORS.blue, '[LOG]', ...args, COLORS.reset);
}

function logServerError(...args) {
  // eslint-disable-next-line no-console
  console.log(COLORS.red, 'SERVER ERROR:', ...args, COLORS.reset);
}

function logClientError(...args) {
  // eslint-disable-next-line no-console
  console.log(COLORS.red, 'CLIENT ERROR:', ...args, COLORS.reset);
}

function logWarning(...args) {
  // eslint-disable-next-line no-console
  console.log(COLORS.yellow, 'WARNING:', ...args, COLORS.reset);
}

module.exports = {
  log,
  logServerError,
  logWarning,
  logClientError
};
