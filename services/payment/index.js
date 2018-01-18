'use strict';

const Invoices = require('../../dao/invoices');
const PaymentMethods = require('../../dao/payment-methods');
const Stripe = require('../stripe');

async function payInvoice(invoiceId, paymentMethodId) {
  const paymentMethod = await PaymentMethods.findById(paymentMethodId);

  const charge = await Stripe.charge(paymentMethod);

  const updated = await Invoices.update(invoiceId, {
    paidAt: new Date(),
    paymentMethodId,
    stripeChargeId
  });
}
