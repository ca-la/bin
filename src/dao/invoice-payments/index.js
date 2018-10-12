'use strict';

const rethrow = require('pg-rethrow');
const uuid = require('node-uuid');

const db = require('../../services/db');
const first = require('../../services/first').default;
const InvoicePayment = require('../../domain-objects/invoice-payment');
const { validatePropertiesFormatted } = require('../../services/validate');

const instantiate = row => new InvoicePayment(row);
const maybeInstantiate = data => (data && new InvoicePayment(data)) || null;

const TABLE_NAME = 'invoice_payments';

function validate(data) {
  const requiredMessages = {
    invoiceId: 'Invoice ID',
    totalCents: 'Total Payment Amount'
  };

  validatePropertiesFormatted(data, requiredMessages);
}

async function findById(id) {
  return db(TABLE_NAME)
    .select('*')
    .where({ id, deleted_at: null })
    .limit(1)
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow);
}

function createTrx(trx, data) {
  validate(data);

  return db(TABLE_NAME)
    .transacting(trx)
    .insert({
      id: uuid.v4(),
      created_at: data.createdAt,
      invoice_id: data.invoiceId,
      total_cents: data.totalCents,
      payment_method_id: data.paymentMethodId,
      stripe_charge_id: data.stripeChargeId,
      rumbleship_purchase_hash: data.rumbleshipPurchaseHash
    }, '*')
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

module.exports = {
  findById,
  createTrx
};
