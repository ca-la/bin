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

function getInvoiceAmount(finalPricingTable, newStatusId) {
  requireValues({ finalPricingTable, newStatusId });

  const { summary } = finalPricingTable;

  switch (newStatusId) {
    case 'NEEDS_DEVELOPMENT_PAYMENT':
      return {
        invoiceAmountCents: summary.upfrontCostCents,
        invoiceMarginCents: summary.upfrontMarginCents
      };
    case 'NEEDS_PRODUCTION_PAYMENT':
      return {
        invoiceAmountCents: summary.preProductionCostCents,
        invoiceMarginCents: summary.preProductionMarginCents
      };
    case 'NEEDS_FULFILLMENT_PAYMENT':
      return {
        invoiceAmountCents: summary.uponCompletionCostCents,
        invoiceMarginCents: summary.uponCompletionMarginCents
      };
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

  const pricingTableLineItems = [];

  finalPricingTable.groups.forEach((group) => {
    group.lineItems.forEach((lineItem) => {
      pricingTableLineItems.push({
        groupTitle: group.title,
        lineItemTitle: lineItem.title,
        quantity: lineItem.quantity,
        unitPriceCents: lineItem.unitPriceCents,
        unitMarginCents: lineItem.unitMarginCents
      });
    });
  });

  const {
    invoiceAmountCents,
    invoiceMarginCents
  } = getInvoiceAmount(finalPricingTable, newStatusId);

  return db.transaction(async (trx) => {
    const invoice = await InvoicesDAO.createTrx(trx, {
      totalCents: invoiceAmountCents,
      title: `${design.title} — ${status.label}`,
      designId: design.id,
      designStatusId: newStatusId
    });

    const stripeFeeCents = calculateStripeFee(invoiceAmountCents);

    await InvoiceBreakdownsDAO.createTrx(trx, {
      invoiceId: invoice.id,

      invoiceAmountCents,
      invoiceMarginCents,
      stripeFeeCents,

      costOfServicesCents: invoiceAmountCents - invoiceMarginCents,
      totalProfitCents: invoiceMarginCents - stripeFeeCents,
      pricingTableData: { pricingTableLineItems }
    });
  });
}

module.exports = createInvoice;
