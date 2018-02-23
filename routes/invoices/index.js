'use strict';

const Router = require('koa-router');

const Invoices = require('../../dao/invoices');
const payInvoice = require('../../services/pay-invoice');
const payOutPartner = require('../../services/pay-out-partner');
const requireAdmin = require('../../middleware/require-admin');
const User = require('../../domain-objects/user');
const { canAccessDesignInQuery } = require('../../middleware/can-access-design');

const router = new Router();

function* getInvoices(next) {
  const { designId, designStatusId } = this.query;

  this.assert(designId, 400, 'Missing design ID');

  let invoices;

  if (designStatusId) {
    yield canAccessDesignInQuery.call(this, next);
    invoices = yield Invoices.findUnpaidByDesignAndStatus(designId, designStatusId);
  } else {
    const isAdmin = (this.state.role === User.ROLES.admin);
    this.assert(isAdmin, 403);

    invoices = yield Invoices.findByDesign(designId);
  }

  this.body = invoices;
  this.status = 200;
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

router.get('/', getInvoices);
router.post('/:invoiceId/pay', postPayInvoice);
router.post('/:invoiceId/pay-out-to-partner', requireAdmin, postPayOut);

module.exports = router.routes();
