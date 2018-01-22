'use strict';

const Invoices = require('../../dao/invoices');
const PaymentMethods = require('../../dao/payment-methods');
const Stripe = require('../stripe');

async function payInvoice(invoiceId, paymentMethodId) {
  const paymentMethod = await PaymentMethods.findById(paymentMethodId);

  const invoice = await Invoices.findById(invoiceId);

  const charge = await Stripe.charge({
    customerId: paymentMethod.stripeCustomerId,
    sourceId: paymentMethod.stripeSourceId,
    amountCents: invoice.totalCents,
    description: invoice.title,
    invoiceId
  });

  const updated = await Invoices.update(invoiceId, {
    paidAt: new Date(),
    paymentMethodId,
    stripeChargeId: charge.id
  });

  return updated;
}

module.exports = {
  payInvoice
};
