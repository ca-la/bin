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
const {
  RUMBLESHIP_API_KEY_ACH,
  RUMBLESHIP_API_KEY_FINANCING
} = require('../../config');

const PARTNER_KEYS = {
  RUMBLESHIP_ACH: RUMBLESHIP_API_KEY_ACH,
  RUMBLESHIP_FINANCING: RUMBLESHIP_API_KEY_FINANCING
};

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

function* getPartnerCheckoutEligibility() {
  // Find out whether a designer is eligible to pay using a deferred plan using
  // a financing partner (as of 2018-03, only Rumbleship).
  const { designId } = this.query;
  this.assert(designId, 400, 'Missing design ID');

  const design = yield ProductDesignsDAO.findById(designId);

  this.assert(design, 400, 'Invalid design ID');

  const user = yield UsersDAO.findById(this.state.userId);

  const response = {};

  for (const partnerId of Object.keys(PARTNER_KEYS)) {
    if (design.status === 'NEEDS_DEVELOPMENT_PAYMENT') {
      response[partnerId] = { isAuthorized: false };
      // eslint-disable-next-line no-continue
      continue;
    }

    const rs = new Rumbleship({ apiKey: PARTNER_KEYS[partnerId] });
    const result = yield rs.getBuyerAuthorization({ customerEmail: user.email });

    response[partnerId] = {
      isAuthorized: result.isBuyerAuthorized,
      rumbleshipPayload: result.isBuyerAuthorized ? {
        bsToken: result.bsToken,
        buyerHash: result.buyerHash,
        supplierHash: result.supplierHash
      } : null
    };
  }

  this.body = response;
  this.status = 200;
}

function* beginPartnerCheckout() {
  const { rumbleshipPayload, invoiceId, partnerId } = this.request.body;
  this.assert(rumbleshipPayload, 400, 'Missing rumbleship payload');
  this.assert(invoiceId, 400, 'Missing invoice ID');
  this.assert(PARTNER_KEYS[partnerId], 400, 'Invalid partner ID');

  const { bsToken, buyerHash, supplierHash } = rumbleshipPayload;
  this.assert(bsToken, 400, 'Missing rumbleshipPayload.bsToken');
  this.assert(buyerHash, 400, 'Missing rumbleshipPayload.buyerHash');
  this.assert(supplierHash, 400, 'Missing rumbleshipPayload.supplierHash');

  const invoice = yield InvoicesDAO.findById(invoiceId);

  this.assert(invoice, 400, 'Invoice not found');

  const rs = new Rumbleship({ apiKey: PARTNER_KEYS[partnerId] });

  const { purchaseHash } = yield rs.createPurchaseOrder({
    buyerHash,
    supplierHash,
    invoice,
    partnerId,
    bsToken
  });

  this.status = 200;

  this.body = {
    rumbleshipPayload: { purchaseHash },
    checkoutUrl: Rumbleship.getCheckoutUrl({ purchaseHash, bsToken })
  };
}

function* completePartnerCheckout() {
  const { rumbleshipPayload, invoiceId, partnerId } = this.request.body;
  const { purchaseHash, poToken } = rumbleshipPayload;

  this.assert(PARTNER_KEYS[partnerId], 400, 'Invalid partner ID');

  const invoice = yield InvoicesDAO.findById(invoiceId);

  const rs = new Rumbleship({ apiKey: PARTNER_KEYS[partnerId] });
  yield rs.confirmFullOrder({ purchaseHash, poToken, invoice });
  this.status = 204;
}

router.get('/', requireAuth, getPaymentMethods);
router.post('/', requireAuth, addPaymentMethod);

router.get('/partner-checkout-eligibility', requireAuth, getPartnerCheckoutEligibility);
router.post('/begin-partner-checkout', requireAuth, beginPartnerCheckout);
router.post('/complete-partner-checkout', requireAuth, completePartnerCheckout);

module.exports = router.routes();
