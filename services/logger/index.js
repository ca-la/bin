'use strict';

function log(...args) {
  // eslint-disable-next-line no-console
  console.log('[LOG]', ...args);
}

function logServerError(...args) {
  // eslint-disable-next-line no-console
  console.log('SERVER ERROR:', ...args);
}

function logClientError(...args) {
  // eslint-disable-next-line no-console
  console.log('CLIENT ERROR:', ...args);
}

module.exports = {
  log,
  logServerError,
  logClientError
};
