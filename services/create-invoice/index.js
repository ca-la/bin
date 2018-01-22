'use strict';

const InvoicesDAO = require('../../dao/invoices');
const ProductDesignStatusesDAO = require('../../dao/product-design-statuses');
const { getAllPricingTables } = require('../../services/pricing-table');
const { requireValues } = require('../../services/require-properties');

function getInvoiceAmount(finalPricingTable, newStatusId) {
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

  const { finalPricingTable } = await getAllPricingTables(design);

  const invoiceAmount = getInvoiceAmount(finalPricingTable, newStatusId);

  await InvoicesDAO.create({
    totalCents: invoiceAmount,
    title: `${design.title} — ${status.label}`,
    designId: design.id,
    designStatusId: newStatusId
  });
}

module.exports = createInvoice;
