'use strict';

const Router = require('koa-router');

const pkg = require('../../../package.json');
const db = require('../../services/db');
const sha256 = require('../../services/insecure-hash').default;

const router = new Router();

// eslint-disable-next-line require-yield
function* getRoot() {
  const result = yield db.raw(`
    select name from knex_migrations order by name desc;
  `);

  const names = result.rows.map(row => row.name).join('\n');
  const migrationListHash = sha256(names);

  this.status = 200;
  this.body = {
    name: pkg.name,
    version: pkg.version,
    migrationListHash,
    status: 'ok'
  };
}

router.get('/', getRoot);

module.exports = router.routes();
