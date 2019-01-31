'use strict';

const pkg = require('../../../package.json');

function* headers(next) {
  this.set('Access-Control-Allow-Origin', '*');
  this.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS');
  this.set('Access-Control-Allow-Credentials', 'true');
  this.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  this.set('X-Powered-By', [pkg.name, pkg.version].join('@'));
  yield next;
}

module.exports = headers;
