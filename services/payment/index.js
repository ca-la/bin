'use strict';

const InvalidDataError = require('../../errors/invalid-data');
const Invoices = require('../../dao/invoices');
const PaymentMethods = require('../../dao/payment-methods');
const ProductDesignsDAO = require('../../dao/product-designs');
const ProductDesignStatusesDAO = require('../../dao/product-design-statuses');
const Stripe = require('../stripe');
const updateDesignStatus = require('../update-design-status');
const { requireValues } = require('../require-properties');

async function payInvoice(invoiceId, paymentMethodId, userId) {
  requireValues({ invoiceId, paymentMethodId, userId });
  const paymentMethod = await PaymentMethods.findById(paymentMethodId);

  const invoice = await Invoices.findById(invoiceId);

  if (invoice.paidAt) {
    throw new InvalidDataError('This invoice is already paid');
  }

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

  const design = await ProductDesignsDAO.findById(invoice.designId);
  const status = await ProductDesignStatusesDAO.findById(design.status);

  requireValues({ design, status });

  if (status.nextStatus) {
    await updateDesignStatus(
      invoice.designId,
      status.nextStatus,
      userId
    );
  }

  return updated;
}

module.exports = {
  payInvoice
};
