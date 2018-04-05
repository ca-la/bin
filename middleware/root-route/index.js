'use strict';

const Router = require('koa-router');

const pkg = require('../../package.json');
const db = require('../../services/db');
const sha256 = require('../../services/insecure-hash');

const router = new Router();

// eslint-disable-next-line require-yield
function* getRoot() {
  const result = yield db.raw(`
    select name from knex_migrations order by migration_time desc limit 1;
  `);

  const lastMigrationName = result.rows[0].name;
  const lastMigrationHash = sha256(lastMigrationName);

  this.status = 200;
  this.body = {
    name: pkg.name,
    version: pkg.version,
    lastMigrationHash,
    status: 'ok'
  };
}

router.get('/', getRoot);

module.exports = router.routes();
