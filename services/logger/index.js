'use strict';

function log(...args) {
  // eslint-disable-next-line no-console
  console.log('[LOG]', ...args);
}

module.exports = {
  log
};
