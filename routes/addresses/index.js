'use strict';

const Router = require('koa-router');

const AddressesDAO = require('../../dao/addresses');
const canAccessUserResource = require('../../middleware/can-access-user-resource');
const filterError = require('../../services/filter-error');
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

  const address = yield AddressesDAO.create(addressData)
    .catch(filterError(InvalidDataError, err => this.throw(400, err)));

  this.status = 201;
  this.body = address;
}

/**
 * DELETE /addresses/:id
 */
function* deleteAddress() {
  const { addressId } = this.params;

  const address = yield AddressesDAO.findById(addressId);
  this.assert(address, 404);

  canAccessUserResource.call(this, address.userId);
  yield AddressesDAO.deleteById(addressId);
  this.status = 204;
}

router.get('/', requireAuth, getList);
router.post('/', requireAuth, createAddress);
router.del('/:addressId', requireAuth, deleteAddress);

module.exports = router.routes();
