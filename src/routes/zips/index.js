'use strict';

const Router = require('koa-router');
const zipcodes = require('zipcodes');

const router = new Router();

/**
 * GET /zips/:zip
 */
function* getZip() { // eslint-disable-line require-yield
  const zip = zipcodes.lookup(this.params.zip);
  this.assert(zip, 404, 'Zip not found');
  this.status = 200;
  this.body = zip;
}

router.get('/:zip', getZip);

module.exports = router.routes();
