'use strict';

const Router = require('koa-router');

const filterError = require('../../services/filter-error');
const InvalidDataError = require('../../errors/invalid-data');
const ProductionPricesDAO = require('../../dao/production-prices');
const requireAuth = require('../../middleware/require-auth');
const User = require('../../components/users/domain-object');
const UsersDAO = require('../../components/users/dao');

const router = new Router();

async function verifyEligibility(vendorUserId) {
  const user = await UsersDAO.findById(vendorUserId);
  const name = (user && user.name) || 'This user';
  this.assert(
    user && user.role === 'PARTNER',
    400,
    `${name} is not a production partner. Only production partners can specify pricing tables.`
  );
}

function* replacePrices() {
  const { vendorUserId, serviceId } = this.query;
  this.assert(serviceId, 400, 'Service ID must be provided');

  this.assert(vendorUserId, 400, 'Vendor ID must be provided');
  yield verifyEligibility.call(this, vendorUserId);

  const isAdmin = this.state.role === User.ROLES.admin;
  const isCurrentUser = vendorUserId === this.state.userId;

  this.assert(
    isAdmin || isCurrentUser,
    403,
    'You can only update your own pricing'
  );

  const prices = yield ProductionPricesDAO.replaceForVendorAndService(
    vendorUserId,
    serviceId,
    this.request.body
  );

  this.body = prices;
  this.status = 200;
}

function* getPrices() {
  const { vendorUserId, serviceId } = this.query;

  this.assert(vendorUserId, 400, 'Vendor ID must be provided');
  yield verifyEligibility.call(this, vendorUserId);

  if (vendorUserId && serviceId) {
    // Both filters are provided, find a list by vendor *and* service
    this.body = yield ProductionPricesDAO.findByVendorAndService(
      vendorUserId,
      serviceId
    ).catch(filterError(InvalidDataError, err => this.throw(400, err)));
  } else {
    // Only vendor was provided, find all services
    this.body = yield ProductionPricesDAO.findByVendor(vendorUserId).catch(
      filterError(InvalidDataError, err => this.throw(400, err))
    );
  }

  this.status = 200;
}

router.put('/', requireAuth, replacePrices);
router.get('/', requireAuth, getPrices);

module.exports = router.routes();
