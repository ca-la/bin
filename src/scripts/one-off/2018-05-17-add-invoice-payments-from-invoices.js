'use strict';

const uuid = require('node-uuid');
const process = require('process');

const { yellow, red } = require('../../services/colors').fmt;
const db = require('../../services/db');
const Logger = require('../../services/logger');

async function moveInvoicePayments() {
  const rows = await db
    .select(
      'paid_at',
      'id',
      'total_cents',
      'payment_method_id',
      'stripe_charge_id',
      'rumbleship_purchase_hash'
    )
    .whereNotNull('paid_at')
    .from('invoices');

  if (rows.length === 0) {
    Logger.log('There were no paid invoices found in the source invoice table');
    return Promise.resolve();
  }

  const invoicePayments = rows.map(row => ({
    id: uuid.v4(),
    invoice_id: row.id,
    created_at: row.paid_at,
    total_cents: row.total_cents,
    payment_method_id: row.payment_method_id,
    stripe_charge_id: row.stripe_charge_id,
    rumbleship_purchase_hash: row.rumbleship_purchase_hash
  }));

  Logger.log(
    yellow(`Attempting to insert ${invoicePayments.length} payments.`)
  );

  return db('invoice_payments')
    .returning('invoice_id')
    .insert(invoicePayments)
    .then(insertedIds => {
      Logger.log(yellow(`Inserted ${insertedIds.length} payments.`));
      if (insertedIds.length !== invoicePayments.length) {
        const missingInvoiceIds = invoicePayments.filter(
          payment => !invoicePayments.includes(payment.invoice_id)
        );

        Logger.log(red('Some records not inserted.'));
        Logger.log(red(`Missing ${missingInvoiceIds.length} invoices:`));
        missingInvoiceIds.forEach(missing => Logger.log(` - ${missing}`));

        return Promise.reject();
      }

      return Promise.resolve();
    });
}

moveInvoicePayments()
  .then(() => process.exit())
  .catch(() => process.exit(1));
