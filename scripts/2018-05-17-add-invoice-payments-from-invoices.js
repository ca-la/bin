'use strict';

const uuid = require('node-uuid');

const { green, yellow, red } = require('../services/colors').fmt;
const db = require('../services/db');
const Logger = require('../services/logger');

async function moveInvoicePayments() {
  const rows = await db
    .select('paid_at', 'id', 'total_cents', 'payment_method_id', 'stripe_charge_id', 'rumbleship_purchase_hash')
    .whereNotNull('paid_at')
    .from('invoices');
  const invoicePayments = rows
    .map(row => ({
      id: uuid.v4(),
      invoice_id: row.id,
      created_at: row.paid_at,
      total_cents: row.total_cents,
      payment_method_id: row.payment_method_id,
      stripe_charge_id: row.stripe_charge_id,
      rumbleship_purchase_hash: row.rumbleship_purchase_hash
    }));

  Logger.log(yellow(`Attempting to insert ${invoicePayments.length} payments.`));

  return db('invoice_payments')
    .returning('invoice_id')
    .insert(invoicePayments)
    .then((insertedIds) => {
      if (insertedIds.length === invoicePayments.length) {
        Logger.log(green('Successfully inserted all invoice payments.'));
      } else {
        const missingInvoiceIds = invoicePayments
          .filter(payment => !invoicePayments.includes(payment.invoice_id));

        Logger.log(red('Some records not inserted.'));
        Logger.log(red(`Missing ${missingInvoiceIds.length} invoices:`));
        missingInvoiceIds.forEach(missing => Logger.log(` - ${missing}`));
      }
    });
}

moveInvoicePayments();
