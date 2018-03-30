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
const { RUMBLESHIP_API_KEY } = require('../../config');

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

function* getPartnerEligibility() {
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

  const rs = new Rumbleship({ apiKey: RUMBLESHIP_API_KEY });

  const {
    bsToken,
    buyerHash,
    isBuyerAuthorized,
    supplierHash
  } = yield rs.getBuyerAuthorization({ customerEmail: user.email });

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

function* beginPartnerCheckout() {
  const { rumbleshipPayload, invoiceId } = this.request.body;
  this.assert(rumbleshipPayload, 400, 'Missing rumbleship payload');
  this.assert(invoiceId, 400, 'Missing invoice ID');

  const { bsToken, buyerHash, supplierHash } = rumbleshipPayload;
  this.assert(bsToken, 400, 'Missing rumbleshipPayload.bsToken');
  this.assert(buyerHash, 400, 'Missing rumbleshipPayload.buyerHash');
  this.assert(supplierHash, 400, 'Missing rumbleshipPayload.supplierHash');

  const invoice = yield InvoicesDAO.findById(invoiceId);

  this.assert(invoice, 400, 'Invoice not found');

  const rs = new Rumbleship({ apiKey: RUMBLESHIP_API_KEY });

  const { purchaseHash, poToken } = yield rs.createPurchaseOrder({
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

function* completePartnerCheckout() {
  const { rumbleshipPayload, invoiceId } = this.request.body;
  const { purchaseHash, poToken } = rumbleshipPayload;

  const invoice = yield InvoicesDAO.findById(invoiceId);

  const rs = new Rumbleship({ apiKey: RUMBLESHIP_API_KEY });
  yield rs.confirmFullOrder({ purchaseHash, poToken, invoice });
  this.status = 204;
}

router.get('/', requireAuth, getPaymentMethods);
router.post('/', requireAuth, addPaymentMethod);

router.get('/partner-eligibility', requireAuth, getPartnerEligibility);
router.post('/begin-partner-checkout', requireAuth, beginPartnerCheckout);
router.post('/complete-partner-checkout', requireAuth, completePartnerCheckout);

module.exports = router.routes();
