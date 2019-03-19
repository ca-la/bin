'use strict';

const pkg = require('../../../package.json');

function* headers(next) {
  this.set('Access-Control-Allow-Origin', '*');
  this.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS');
  this.set('Access-Control-Allow-Credentials', 'true');
  this.set('Access-Control-Max-Age', 86400);
  this.set('Cache-Control', 'no-cache');

  const requestHeaders = this.request.headers['access-control-request-headers'];

  // Per the CORS header handshake; the client requests via an OPTIONS request
  // to be able to send a set of headers in the subsequent GET/POST/etc. If that
  // request is present, we return it verbatim, i.e. allow all headers.
  if (requestHeaders) {
    this.set('Access-Control-Allow-Headers', requestHeaders);
  } else {
    this.set('Access-Control-Allow-Headers', 'Authorization');
  }

  this.set('X-Powered-By', [pkg.name, pkg.version].join('@'));
  yield next;
}

module.exports = headers;
