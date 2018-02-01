'use strict';

const Router = require('koa-router');

const InvalidDataError = require('../../errors/invalid-data');
const ProductionPricesDAO = require('../../dao/production-prices');
const requireAuth = require('../../middleware/require-auth');
const User = require('../../domain-objects/user');

const router = new Router();

function* replacePrices() {
  const { vendorUserId, serviceId } = this.query;
  this.assert(serviceId, 400, 'Service ID must be provided');

  const isAdmin = (this.state.role === User.ROLES.admin);
  const isCurrentUser = (vendorUserId === this.state.userId);

  this.assert(isAdmin || isCurrentUser, 403, 'You can only update your own pricing');

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

  if (vendorUserId && serviceId) {
    // Both filters are provided, find a list by vendor *and* service
    this.body = yield ProductionPricesDAO.findByVendorAndService(vendorUserId, serviceId)
      .catch(InvalidDataError, err => this.throw(400, err));
  } else {
    // Only vendor was provided, find all services
    this.body = yield ProductionPricesDAO.findByVendor(vendorUserId)
      .catch(InvalidDataError, err => this.throw(400, err));
  }

  this.status = 200;
}

router.put('/', requireAuth, replacePrices);
router.get('/', requireAuth, getPrices);

module.exports = router.routes();
