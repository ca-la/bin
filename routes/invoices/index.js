'use strict';

const Router = require('koa-router');

const Invoices = require('../../dao/invoices');
const payInvoice = require('../../services/pay-invoice');
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

router.get('/', getInvoices);
router.post('/:invoiceId/pay', postPayInvoice);

module.exports = router.routes();
