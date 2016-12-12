'use strict';

const router = require('koa-router')({
  prefix: '/addresses'
});

const AddressesDAO = require('../../dao/addresses');
const requireAuth = require('../../middleware/require-auth');

/**
 * GET /addresses?userId=ABC123
 */
function* getList() {
  this.assert(this.query.userId === this.state.userId, 403, 'You can only request addresses for your own user');

  const addresses = yield AddressesDAO.findByUserId(this.query.userId);

  this.body = addresses;
  this.status = 200;
}

router.get('/', requireAuth, getList);

module.exports = router.routes();
