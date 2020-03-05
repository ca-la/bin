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
  this.assert(
    this.query.userId === this.state.userId,
    403,
    'You can only request addresses for your own user'
  );

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

  const address = yield AddressesDAO.create(addressData).catch(
    filterError(InvalidDataError, err => this.throw(400, err))
  );

  this.status = 201;
  this.body = address;
}

/**
 * PATCH /addresses/:id
 */
function* updateAddress() {
  const { addressId } = this.params;
  this.assert(this.request.body, 400, 'New data must be provided');

  const address = yield AddressesDAO.findById(addressId);
  this.assert(address, 404);

  canAccessUserResource.call(this, address.userId);

  const updated = yield AddressesDAO.update(addressId, this.request.body);

  this.status = 200;
  this.body = updated;
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

/**
 * PUT /addresses/:id
 * Puts back deleted address
 */
function* putAddress() {
  const { addressId } = this.params;
  this.body = yield AddressesDAO.update(addressId, this.request.body);

  this.status = 200;
}

router.get('/', requireAuth, getList);
router.post('/', requireAuth, createAddress);
router.patch('/:addressId', requireAuth, updateAddress);
router.del('/:addressId', requireAuth, deleteAddress);
router.put('/:addressId', requireAuth, putAddress);

module.exports = router.routes();
