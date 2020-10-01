"use strict";

const InvalidDataError = require("../../errors/invalid-data");

const db = require("../../services/db");
const InvoicePaymentsDAO = require("../../components/invoice-payments/dao");
const InvoicesDAO = require("../../dao/invoices");
const PaymentMethods = require("../../components/payment-methods/dao");
const spendCredit = require("../../components/credits/spend-credit").default;

const Stripe = require("../stripe");
const { requireValues } = require("../require-properties");

async function transactInvoice(invoiceId, paymentMethodId, userId, trx) {
  // We acquire an update lock on the relevant invoice row to make sure we can
  // only be in the process of paying for one invoice at a given time.
  await db
    .raw("select * from invoices where id = ? for update", [invoiceId])
    .transacting(trx);

  let invoice = await InvoicesDAO.findByIdTrx(trx, invoiceId);

  const paymentMethod = await PaymentMethods.findById(paymentMethodId, trx);

  if (invoice.isPaid) {
    throw new InvalidDataError("This invoice is already paid");
  }

  const { nonCreditPaymentAmount } = await spendCredit(userId, invoice, trx);

  if (nonCreditPaymentAmount > 0) {
    const charge = await Stripe.charge({
      customerId: paymentMethod.stripeCustomerId,
      sourceId: paymentMethod.stripeSourceId,
      amountCents: nonCreditPaymentAmount,
      description: invoice.title,
      invoiceId,
    });

    await InvoicePaymentsDAO.createTrx(trx, {
      invoiceId,
      paymentMethodId,
      stripeChargeId: charge.id,
      totalCents: nonCreditPaymentAmount,
    });
  }

  invoice = await InvoicesDAO.findByIdTrx(trx, invoiceId);

  return { invoice, nonCreditPaymentAmount };
}

async function payInvoice(invoiceId, paymentMethodId, userId, trx) {
  requireValues({ invoiceId, paymentMethodId, userId, trx });

  return transactInvoice(invoiceId, paymentMethodId, userId, trx);
}

module.exports = payInvoice;
