'use strict';

const Router = require('koa-router');

const router = new Router();

function* getInvoices() {
}

function* payInvoice() {
}

router.get('/', getInvoices);
router.post('/:invoiceId/pay', payInvoice);

module.exports = router.routes();
