'use strict';

const InvalidDataError = require('../../errors/invalid-data');

const InvoicesDAO = require('../../dao/invoices');
const InvoicePaymentsDAO = require('../../dao/invoice-payments');
const PaymentMethods = require('../../dao/payment-methods');
const ProductDesignsDAO = require('../../dao/product-designs');
const ProductDesignStatusesDAO = require('../../dao/product-design-statuses');
const UsersDAO = require('../../dao/users');

const Logger = require('../logger');
const SlackService = require('../slack');
const Stripe = require('../stripe');
const updateDesignStatus = require('../update-design-status');
const { requireValues } = require('../require-properties');

async function payInvoice(invoiceId, paymentMethodId, userId) {
  requireValues({ invoiceId, paymentMethodId, userId });
  const paymentMethod = await PaymentMethods.findById(paymentMethodId);

  let invoice = await InvoicesDAO.findById(invoiceId);

  if (invoice.isPaid) {
    throw new InvalidDataError('This invoice is already paid');
  }

  const charge = await Stripe.charge({
    customerId: paymentMethod.stripeCustomerId,
    sourceId: paymentMethod.stripeSourceId,
    amountCents: invoice.totalCents,
    description: invoice.title,
    invoiceId
  });
  await InvoicePaymentsDAO.create({
    invoiceId,
    paymentMethodId,
    stripeChargeId: charge.id,
    totalCents: invoice.totalCents
  });

  invoice = await InvoicesDAO.findById(invoiceId);

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

  try {
    const paymentNotification = {
      channel: 'designers',
      templateName: 'designer_payment',
      params: {
        design,
        designer: await UsersDAO.findById(userId),
        paymentAmountCents: invoice.totalCents
      }
    };
    await SlackService.enqueueSend(paymentNotification);
  } catch (e) {
    Logger.logWarning('There was a problem sending the payment notification to Slack', e);
  }

  return invoice;
}

module.exports = payInvoice;
