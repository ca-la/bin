'use strict';

const fetch = require('node-fetch');

const InvalidPaymentError = require('../../errors/invalid-payment');
const Logger = require('../../services/logger');
const StripeError = require('../../errors/stripe');
const { requireValues } = require('../../services/require-properties');
const { STRIPE_SECRET_KEY } = require('../../config');

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

async function makeRequest(method, path, data) {
  const url = `${STRIPE_API_BASE}/${path}`;

  const options = {
    method,
    headers: {
      Authorization: `Basic ${STRIPE_SECRET_KEY}`
    }
  };

  if (data) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type');
  const isJson = /application\/.*json/.test(contentType);

  if (!isJson) {
    const text = await response.text();
    Logger.logServerError('Stripe request: ', method, url);
    Logger.logServerError('Stripe response: ', response.status, text);
    throw new Error(`Unexpected Stripe response type: ${contentType}`);
  }

  const json = await response.json();

  switch (response.status) {
    case 200: return json;
    case 201: throw new InvalidPaymentError('Your payment method was declined');
    default: throw new StripeError(json);
  }
}

async function charge({ customerId, sourceToken, amountCents, description }) {
  requireValues({ customerId, sourceToken, amountCents, description });

  return makeRequest('post', '/charges', {
    amount: amountCents,
    currency: 'usd',
    source: sourceToken,
    description,
    customer: customerId
  });
}

module.exports = {
  charge
};
