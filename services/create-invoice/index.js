'use strict';

const db = require('../../services/db');
const InvoiceBreakdownsDAO = require('../../dao/invoice-breakdowns');
const InvoicesDAO = require('../../dao/invoices');
const PricingCalculator = require('../../services/pricing-table');
const ProductDesignStatusesDAO = require('../../dao/product-design-statuses');
const { requireValues } = require('../../services/require-properties');

// Will obvs have to update this if we ever switch to an enterprise plan
function calculateStripeFee(totalCents) {
  return Math.round((0.029 * totalCents) + 30);
}

function getInvoiceAmountCents(finalPricingTable, newStatusId) {
  requireValues({ finalPricingTable, newStatusId });

  const { summary } = finalPricingTable;

  switch (newStatusId) {
    case 'NEEDS_DEVELOPMENT_PAYMENT':
      return summary.upfrontCostCents;
    case 'NEEDS_PRODUCTION_PAYMENT':
      return summary.preProductionCostCents;
    case 'NEEDS_FULFILLMENT_PAYMENT':
      return summary.uponCompletionCostCents;
    default:
      throw new Error(`Cannot calculate invoice amount for status ${newStatusId}`);
  }
}

/**
 * @param {Design} design
 * @param {String} newStatusId e.g. "NEEDS_DEVELOPMENT_PAYMENT"
 */
async function createInvoice(design, newStatusId) {
  const status = await ProductDesignStatusesDAO.findById(newStatusId);

  const calculator = new PricingCalculator(design);
  const { finalPricingTable } = await calculator.getAllPricingTables();

  const invoiceAmountCents = getInvoiceAmountCents(finalPricingTable, newStatusId);

  return db.transaction(async (trx) => {
    try {
      const invoice = await InvoicesDAO.create({
        totalCents: invoiceAmountCents,
        title: `${design.title} — ${status.label}`,
        designId: design.id,
        designStatusId: newStatusId
      }, trx);

      const totalCostCents = 0;

      const stripeFeeCents = calculateStripeFee(invoiceAmountCents);
      const totalRevenueCents = invoiceAmountCents - stripeFeeCents;
      const totalProfitCents = totalRevenueCents - totalCostCents;

      await InvoiceBreakdownsDAO.create({
        invoiceId: invoice.id,
        invoiceAmountCents,
        totalRevenueCents,
        totalCostCents,
        totalProfitCents,
        stripeFeeCents
      }, trx);

      await trx.commit();
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  });
}

module.exports = createInvoice;
