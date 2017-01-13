'use strict';

const router = require('koa-router')({
  prefix: '/addresses'
});

const AddressesDAO = require('../../dao/addresses');
const InvalidDataError = require('../../errors/invalid-data');
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

/**
 * POST /addresses
 */
function* createAddress() {
  const addressData = Object.assign({}, this.request.body, {
    userId: this.state.userId
  });

  const address = yield AddressesDAO.create(addressData)
    .catch(InvalidDataError, err => this.throw(400, err));

  this.status = 201;
  this.body = address;
}

router.get('/', requireAuth, getList);
router.post('/', requireAuth, createAddress);

module.exports = router.routes();
