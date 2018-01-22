'use strict';

const Router = require('koa-router');

const Invoices = require('../../dao/invoices');
const { payInvoice } = require('../../services/payment');
const { canAccessDesignInQuery } = require('../../middleware/can-access-design');

const router = new Router();

function* getInvoices() {
  const { designId, designStatusId } = this.query;
  this.assert(designId, 400, 'Missing design ID');
  this.assert(designStatusId, 400, 'Missing design status ID');

  const invoices = yield Invoices.findByDesignAndStatus(designId, designStatusId);
  this.body = invoices;
  this.status = 200;
}

function* postPayInvoice() {
  const { paymentMethodId } = this.request.body;
  this.assert(paymentMethodId, 400, 'Missing payment method ID');

  const { invoiceId } = this.params;

  const invoice = yield payInvoice(invoiceId, paymentMethodId);
  this.body = invoice;
  this.status = 200;
}

router.get('/', canAccessDesignInQuery, getInvoices);
router.post('/:invoiceId/pay', postPayInvoice);

module.exports = router.routes();
