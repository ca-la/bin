'use strict';

const router = require('koa-router')({
  prefix: '/zips'
});
const zipcodes = require('zipcodes');

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
