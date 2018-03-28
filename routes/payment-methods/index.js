'use strict';

const Router = require('koa-router');

const canAccessUserResource = require('../../middleware/can-access-user-resource');
const PaymentMethods = require('../../dao/payment-methods');
const UsersDAO = require('../../dao/users');
const requireAuth = require('../../middleware/require-auth');
const Stripe = require('../../services/stripe');
const Rumbleship = require('../../services/rumbleship');

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
  const { stripeCardToken } = this.request.body;
  const { userId } = this.state;

  const stripeCustomerId = yield Stripe.findOrCreateCustomerId(userId);

  // Users send us a stripe card token, but it doesn't become a Source that we
  // can repeatedly charge until we attach it to the customer in Stripe
  const source = yield Stripe.attachSource({
    customerId: stripeCustomerId,
    cardToken: stripeCardToken
  });

  const method = yield PaymentMethods.create({
    stripeCustomerId,
    stripeSourceId: source.id,
    userId,
    lastFourDigits: source.last4
  });

  this.body = method;
  this.status = 201;
}

function* getTermsEligibility() {
  // Find out whether a designer is eligible to pay using a deferred plan using
  // a financing partner (as of 2018-03, only Rumbleship).
  const { designStatus } = this.request.body;
  this.assert(designStatus, 400, 'Missing design status');

  if (designStatus === 'NEEDS_DEVELOPMENT_PAYMENT') {
    this.status = 200;
    this.body = { isEligible: false };
    return;
  }

  const user = yield UsersDAO.findById(this.state.userId);
  const { isEligible, jwt } = yield Rumbleship.getAuthorization(user.email);

  this.status = 200;
  this.body = { isEligible, jwt };
}

router.get('/', requireAuth, getPaymentMethods);
router.get('/terms-eligibility', requireAuth, getTermsEligibility);
router.post('/', requireAuth, addPaymentMethod);

module.exports = router.routes();
