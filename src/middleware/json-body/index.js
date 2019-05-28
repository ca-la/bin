'use strict';

// For requests that could potentially include a JSON body, try to parse it and
// attact to the context for future use.

const parse = require('co-body');

function* jsonBody(next) {
  if (!this.request.is('json')) {
    this.request.body = {};
    return yield next;
  }

  try {
    this.request.body = yield parse.json(this);
  } catch (e) {
    this.throw(400, 'Could not parse body as JSON');
  }

  if (!this.request.body) {
    this.request.body = {};
  }

  return yield next;
}

module.exports = jsonBody;
