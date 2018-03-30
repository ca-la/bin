'use strict';

const Router = require('koa-router');

const canAccessUserResource = require('../../middleware/can-access-user-resource');
const InvoicesDAO = require('../../dao/invoices');
const PaymentMethods = require('../../dao/payment-methods');
const ProductDesignsDAO = require('../../dao/product-designs');
const requireAuth = require('../../middleware/require-auth');
const Rumbleship = require('../../services/rumbleship');
const Stripe = require('../../services/stripe');
const UsersDAO = require('../../dao/users');

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

function* getDeferredEligibility() {
  // Find out whether a designer is eligible to pay using a deferred plan using
  // a financing partner (as of 2018-03, only Rumbleship).
  const { designId } = this.query;
  this.assert(designId, 400, 'Missing design ID');

  const design = yield ProductDesignsDAO.findById(designId);

  this.assert(design, 400, 'Invalid design ID');

  if (design.status === 'NEEDS_DEVELOPMENT_PAYMENT') {
    this.status = 200;
    this.body = { isEligible: false };
    return;
  }

  const user = yield UsersDAO.findById(this.state.userId);
  const {
    bsToken,
    buyerHash,
    isBuyerAuthorized,
    supplierHash
  } = yield Rumbleship.getBuyerAuthorization({ customerEmail: user.email });

  this.status = 200;
  this.body = {
    isBuyerAuthorized,
    rumbleshipPayload: {
      bsToken,
      buyerHash,
      supplierHash
    }
  };
}

function* beginDeferredCheckout() {
  const { rumbleshipPayload, invoiceId } = this.request.body;
  this.assert(rumbleshipPayload, 400, 'Missing rumbleship payload');
  this.assert(invoiceId, 400, 'Missing invoice ID');

  const { bsToken, buyerHash, supplierHash } = rumbleshipPayload;
  this.assert(bsToken, 400, 'Missing rumbleshipPayload.bsToken');
  this.assert(buyerHash, 400, 'Missing rumbleshipPayload.buyerHash');
  this.assert(supplierHash, 400, 'Missing rumbleshipPayload.supplierHash');

  const invoice = yield InvoicesDAO.findById(invoiceId);

  this.assert(invoice, 400, 'Invoice not found');

  const { purchaseHash, poToken } = yield Rumbleship.createPurchaseOrder({
    buyerHash,
    supplierHash,
    invoice,
    bsToken
  });

  this.status = 200;

  this.body = {
    rumbleshipPayload: { purchaseHash, poToken }
  };
}

function* completeDeferredCheckout() {
  const { rumbleshipPayload, invoiceId } = this.request.body;
  const { purchaseHash, poToken } = rumbleshipPayload;

  const invoice = yield InvoicesDAO.findById(invoiceId);
  yield Rumbleship.confirmFullOrder({ purchaseHash, poToken, invoice });
  this.status = 204;
}

router.get('/', requireAuth, getPaymentMethods);
router.post('/', requireAuth, addPaymentMethod);

router.get('/deferred-eligibility', requireAuth, getDeferredEligibility);
router.post('/begin-deferred-checkout', requireAuth, beginDeferredCheckout);
router.post('/complete-deferred-checkout', requireAuth, completeDeferredCheckout);

module.exports = router.routes();
