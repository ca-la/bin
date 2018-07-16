'use strict';

const rethrow = require('pg-rethrow');
const uuid = require('node-uuid');

const db = require('../../services/db');
const first = require('../../services/first');
const InvoicePayment = require('../../domain-objects/invoice-payment');
const { requirePropertiesFormatted } = require('../../services/require-properties');

const instantiate = row => new InvoicePayment(row);
const maybeInstantiate = data => (data && new InvoicePayment(data)) || null;

const TABLE_NAME = 'invoice_payments';

function validate(data) {
  const requiredMessages = {
    invoiceId: 'Invoice ID',
    totalCents: 'Total Payment Amount'
  };

  requirePropertiesFormatted(data, requiredMessages);
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

function create(data) {
  validate(data);

  return db(TABLE_NAME)
    .insert({
      id: uuid.v4(),
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
  create
};
