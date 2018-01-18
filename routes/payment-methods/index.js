'use strict';

const Router = require('koa-router');

const PaymentMethods = require('../../dao/payment-methods');
const canAccessUserResource = require('../../middleware/can-access-user-resource');
const requireAuth = require('../../middleware/require-auth');

const router = new Router();

function* getPaymentMethods() {
  const { userId } = this.query;
  this.assert(userId, 400, 'User ID must be provided');
  canAccessUserResource.call(this, userId);

  const methods = yield PaymentMethods.findByUserId(userId);
  this.body = methods;
  this.status = 200;
}

function* addPaymentMethod() {
  const { stripeCustomerId, stripeSourceId } = this.request.body;

  const method = yield PaymentMethods.create({
    stripeCustomerId,
    stripeSourceId,
    userId: this.state.userId
  });

  this.body = method;
  this.status = 201;
}

router.get('/', requireAuth, getPaymentMethods);
router.post('/', requireAuth, addPaymentMethod);

module.exports = router.routes();
