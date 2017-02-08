'use strict';

const Router = require('koa-router');

const AddressesDAO = require('../../dao/addresses');
const InvalidDataError = require('../../errors/invalid-data');
const requireAuth = require('../../middleware/require-auth');

const router = new Router();

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

  const requiredMessages = {
    addressLine1: 'Address Line 1',
    city: 'City',
    region: 'Region',
    postCode: 'Post Code',
    country: 'Country'
  };

  Object.keys(requiredMessages).forEach((key) => {
    this.assert(addressData[key], 400, `Missing required information: ${requiredMessages[key]}`);
  });

  const address = yield AddressesDAO.create(addressData)
    .catch(InvalidDataError, err => this.throw(400, err));

  this.status = 201;
  this.body = address;
}

router.get('/', requireAuth, getList);
router.post('/', requireAuth, createAddress);

module.exports = router.routes();
