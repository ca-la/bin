'use strict';

const Router = require('koa-router');

const canAccessUserResource = require('../../middleware/can-access-user-resource');
const db = require('../../services/db');
const InvalidDataError = require('../../errors/invalid-data');
const InvoiceBreakdownsDAO = require('../../dao/invoice-breakdowns');
const InvoicesDAO = require('../../dao/invoices');
const payInvoice = require('../../services/pay-invoice');
const payOutPartner = require('../../services/pay-out-partner');
const ProductDesignsDAO = require('../../dao/product-designs');
const requireAdmin = require('../../middleware/require-admin');
const User = require('../../domain-objects/user');
const { canAccessDesignInQuery } = require('../../middleware/can-access-design');
const { validatePropertiesFormatted } = require('../../services/validate');

const router = new Router();

function* getInvoices(next) {
  const { designId, designStatusId, userId } = this.query;

  this.assert(designId || userId, 400, 'Design ID or user ID must be provided');

  let invoices;

  if (userId) {
    canAccessUserResource.call(this, userId);
    invoices = yield InvoicesDAO.findByUser(userId);
  } else if (designStatusId) {
    yield canAccessDesignInQuery.call(this, next);
    invoices = yield InvoicesDAO.findByDesignAndStatus(designId, designStatusId);
  } else {
    const isAdmin = (this.state.role === User.ROLES.admin);
    this.assert(isAdmin, 403);

    invoices = yield InvoicesDAO.findByDesign(designId);
  }

  this.body = invoices;
  this.status = 200;
}

function* getInvoice() {
  const { invoiceId } = this.params;

  const invoice = yield InvoicesDAO.findById(invoiceId);
  this.assert(invoice, 404);

  this.body = invoice;

  this.status = 200;
}

function* deleteInvoice() {
  const { invoiceId } = this.params;

  yield InvoicesDAO.deleteById(invoiceId);

  this.status = 204;
}

function* postPayInvoice() {
  const { paymentMethodId } = this.request.body;
  this.assert(paymentMethodId, 400, 'Missing payment method ID');

  const { invoiceId } = this.params;

  const invoice = yield payInvoice(
    invoiceId,
    paymentMethodId,
    this.state.userId
  );

  this.body = invoice;
  this.status = 200;
}

function* postPayOut() {
  const { invoiceId } = this.params;
  const { message, payoutAccountId, payoutAmountCents } = this.request.body;
  this.assert(message, 400, 'Missing message');
  this.assert(payoutAccountId, 400, 'Missing payout account ID');
  this.assert(payoutAmountCents, 400, 'Missing payout amount');

  yield payOutPartner({
    initiatorUserId: this.state.userId,
    invoiceId,
    payoutAccountId,
    payoutAmountCents,
    message
  });

  this.status = 204;
}

function* createManualInvoice() {
  let invoice;

  const {
    totalCents,
    title,
    description,
    designId,
    breakdown
  } = this.request.body;

  validatePropertiesFormatted(this.request.body, {
    totalCents: 'Total',
    title: 'Title',
    description: 'Description',
    designId: 'Design ID',
    breakdown: 'Breakdown'
  });

  const design = yield ProductDesignsDAO.findById(designId);
  this.assert(design, 400, 'Design not found');

  this.assert(totalCents > 0, 400, 'Invoice amount must be positive');

  const ALLOWED_STATUSES = [
    'NEEDS_DEVELOPMENT_PAYMENT',
    'NEEDS_PRODUCTION_PAYMENT',
    'NEEDS_FULFILLMENT_PAYMENT'
  ];

  if (ALLOWED_STATUSES.indexOf(design.status) < 0) {
    throw new InvalidDataError('Design must be in a NEEDS_PAYMENT status before you can create a new invoice');
  }

  const {
    invoiceAmountCents,
    invoiceMarginCents,
    stripeFeeCents,
    costOfServicesCents,
    totalProfitCents
  } = breakdown;

  validatePropertiesFormatted(breakdown, {
    invoiceAmountCents: 'Breakdown Total',
    invoiceMarginCents: 'Breakdown Margin',
    stripeFeeCents: 'Breakdown Stripe Fee',
    costOfServicesCents: 'Breakdown Cost of Services',
    totalProfitCents: 'Breakdown Total Profit'
  });

  yield db.transaction(async (trx) => {
    invoice = await InvoicesDAO.createTrx(trx, {
      totalCents,
      title,
      description,
      designId,
      designStatusId: design.status
    });

    await InvoiceBreakdownsDAO.createTrx(trx, {
      invoiceId: invoice.id,

      invoiceAmountCents,
      invoiceMarginCents,
      stripeFeeCents,

      costOfServicesCents,
      totalProfitCents
    });
  });

  this.body = invoice;
  this.status = 200;
}

router.get('/', getInvoices);
router.post('/', requireAdmin, createManualInvoice);
router.get('/:invoiceId', requireAdmin, getInvoice);
router.del('/:invoiceId', requireAdmin, deleteInvoice);
router.post('/:invoiceId/pay', postPayInvoice);
router.post('/:invoiceId/pay-out-to-partner', requireAdmin, postPayOut);

module.exports = router.routes();
