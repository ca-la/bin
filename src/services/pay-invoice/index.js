'use strict';

const InvalidDataError = require('../../errors/invalid-data');

const db = require('../../services/db');
const InvoicesDAO = require('../../dao/invoices');
const InvoicePaymentsDAO = require('../../dao/invoice-payments');
const PaymentMethods = require('../../dao/payment-methods');
const ProductDesignsDAO = require('../../dao/product-designs');
const CollectionsDAO = require('../../dao/collections');
const ProductDesignStatusesDAO = require('../../dao/product-design-statuses');
const UsersDAO = require('../../dao/users');

const Logger = require('../logger');
const SlackService = require('../slack');
const Stripe = require('../stripe');
const updateDesignStatus = require('../update-design-status');
const { requireValues } = require('../require-properties');

async function transactInvoice(invoiceId, paymentMethodId, userId, trx) {
  // We acquire an update lock on the relevant invoice row to make sure we can
  // only be in the process of paying for one invoice at a given time.
  await db.raw('select * from invoices where id = ? for update', [invoiceId])
    .transacting(trx);

  let invoice = await InvoicesDAO.findByIdTrx(trx, invoiceId);

  const paymentMethod = await PaymentMethods.findById(paymentMethodId, trx);

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
  await InvoicePaymentsDAO.createTrx(trx, {
    invoiceId,
    paymentMethodId,
    stripeChargeId: charge.id,
    totalCents: invoice.totalCents
  });

  invoice = await InvoicesDAO.findByIdTrx(trx, invoiceId);

  let paymentNotification = {
    channel: 'designers',
    templateName: 'designer_payment',
    params: {
      designer: await UsersDAO.findById(userId),
      paymentAmountCents: invoice.totalCents
    }
  };

  if (invoice.designId) {
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
    paymentNotification = {
      channel: 'designers',
      templateName: 'designer_payment',
      params: {
        design,
        designer: await UsersDAO.findById(userId),
        paymentAmountCents: invoice.totalCents
      }
    };
  } else if (invoice.collectionId) {
    const collection = await CollectionsDAO.findById(invoice.collectionId);
    paymentNotification = {
      channel: 'designers',
      templateName: 'designer_payment',
      params: {
        collection,
        designer: await UsersDAO.findById(userId),
        paymentAmountCents: invoice.totalCents
      }
    };
  }

  try {
    await SlackService.enqueueSend(paymentNotification);
  } catch (e) {
    Logger.logWarning('There was a problem sending the payment notification to Slack', e);
  }

  return invoice;
}

async function payInvoice(invoiceId, paymentMethodId, userId, trx) {
  requireValues({ invoiceId, paymentMethodId, userId });

  if (trx) {
    return transactInvoice(invoiceId, paymentMethodId, userId, trx);
  }
  return db.transaction(async (freshTrx) => {
    return transactInvoice(invoiceId, paymentMethodId, userId, freshTrx);
  });
}

module.exports = payInvoice;
