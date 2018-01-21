'use strict';

const Router = require('koa-router');

const pkg = require('../../package.json');

const router = new Router();

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
