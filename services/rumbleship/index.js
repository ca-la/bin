'use strict';

const fetch = require('node-fetch');
const qs = require('querystring');

const insecureHash = require('../insecure-hash');
const InvalidPaymentError = require('../../errors/invalid-payment');
const Logger = require('../logger');
const PaymentMethodsDAO = require('../../dao/payment-methods');
const { requireValues } = require('../../services/require-properties');
const { RUMBLESHIP_API_KEY } = require('../../config');

const RUMBLESHIP_API_BASE = 'https://api.stripe.com/v1';

const CREDENTIALS = new Buffer(`${STRIPE_SECRET_KEY}:`).toString('base64');

async function makeRequest({ method, path, jwt, data }) {
  requireValues({ method, path });

  const url = `${base}${path}`;

  const options = { method };

  if (jwt) {
    options.headers = {
      Authorization: jwt
    };
  }

  if (data) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data, null, 2);
  }

  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type');
  const isJson = /application\/.*json/.test(contentType);

  if (!isJson) {
    const text = await response.text();
    Logger.logServerError('Rumbleship request: ', method, url);
    Logger.logServerError('Rumbleship response: ', response.status, text);
    throw new Error(`Unexpected Rumbleship response type: ${contentType}`);
  }

  const json = await response.json();

  switch (response.status) {
    case 200: return json;
    default: throw new RumbleshipError(json.error);
  }
}

async function charge({ customerId, sourceId, amountCents, description, invoiceId }) {
  requireValues({ customerId, sourceId, amountCents, description, invoiceId });

  // Using a combination of invoiceId + sourceId ensures that:
  // - We can't charge the same card for the same invoice twice in rapid succesion
  // - Switching sources lets you try again
  //
  // TBD if we need a better solution here but this seems ~fine for now.
  const idempotencyKey = insecureHash(`${invoiceId}/${sourceId}/${amountCents}`);

  return makeRequest({
    method: 'post',
    path: '/charges',
    data: {
      amount: amountCents,
      currency: 'usd',
      source: sourceId,
      description,
      customer: customerId,
      transfer_group: invoiceId
    },
    idempotencyKey
  });
}
