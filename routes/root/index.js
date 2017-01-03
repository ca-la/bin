'use strict';

const router = require('koa-router')();
const pkg = require('../../package.json');

// eslint-disable-next-line require-yield
function* getRoot() {
  this.status = 200;
  this.body = {
    name: pkg.name,
    version: pkg.version,
    status: '👌'
  };
}

router.get('/', getRoot);

module.exports = router.routes();
