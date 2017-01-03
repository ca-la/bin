'use strict';

const router = require('koa-router')({
  prefix: '/scans'
});

const InvalidDataError = require('../../errors/invalid-data');
const requireAuth = require('../../middleware/require-auth');
const ScansDAO = require('../../dao/scans');

function* createScan() {
  const { type } = this.state.body;

  const scan = yield ScansDAO.create({
    type,
    userId: this.state.userId
  })
    .catch(InvalidDataError, err => this.throw(400, err));

  this.status = 201;
  this.body = scan;
}

router.post('/', requireAuth, createScan);

module.exports = router.routes();
