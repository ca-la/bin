'use strict';

// For requests that could potentially include a form-data body, try to parse it
// and attact to the context for future use.

const parse = require('co-body');

function* formDataBody(next) {
  const isForm = Boolean(this.request.is('application/x-www-form-urlencoded'));

  this.request.formDataBody = {};

  if (!isForm) {
    return yield next;
  }

  try {
    this.request.formDataBody = yield parse.form(this);
  } catch (e) {
    this.throw(400, 'Could not parse body as form-data');
  }

  return yield next;
}

module.exports = formDataBody;
