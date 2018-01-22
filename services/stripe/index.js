'use strict';

const fetch = require('node-fetch');
const qs = require('querystring');

const InvalidPaymentError = require('../../errors/invalid-payment');
const Logger = require('../../services/logger');
const PaymentMethodsDAO = require('../../dao/payment-methods');
const StripeError = require('../../errors/stripe');
const UsersDAO = require('../../dao/users');
const { requireValues } = require('../../services/require-properties');
const { STRIPE_SECRET_KEY } = require('../../config');

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

const CREDENTIALS = new Buffer(`${STRIPE_SECRET_KEY}:`).toString('base64');

async function makeRequest(method, path, data, idempotencyKey) {
  const url = `${STRIPE_API_BASE}${path}`;

  const options = {
    method,
    headers: {
      Authorization: `Basic ${CREDENTIALS}`
    }
  };

  if (data) {
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    options.body = qs.stringify(data);
  }

  if (idempotencyKey) {
    options.headers['Idempotency-Key'] = idempotencyKey;
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
    case 402: throw new InvalidPaymentError(
      (json.error && json.error.message) ||
      'Your payment method was declined'
    );
    default: throw new StripeError(json.error);
  }
}

async function charge({ customerId, sourceId, amountCents, description, invoiceId }) {
  requireValues({ customerId, sourceId, amountCents, description, invoiceId });

  // Using a combination of invoiceId + sourceId ensures that:
  // - We can't charge the same card for the same invoice twice in rapid succesion
  // - Switching sources lets you try again
  //
  // TBD if we need a better solution here but this seems ~fine for now.
  const idempotencyKey = `${invoiceId}/${sourceId}`;

  return makeRequest('post', '/charges', {
    amount: amountCents,
    currency: 'usd',
    source: sourceId,
    description,
    customer: customerId
  }, idempotencyKey);
}

async function createCustomer({ email, name }) {
  requireValues({ email, name });

  return makeRequest('post', '/customers', {
    email,
    description: name
  });
}

async function attachSource({ customerId, cardToken }) {
  requireValues({ customerId, cardToken });

  return makeRequest('post', `/customers/${customerId}/sources`, {
    source: cardToken
  });
}

async function findOrCreateCustomerId(userId) {
  const existingPaymentMethods = await PaymentMethodsDAO.findByUserId(userId);
  if (existingPaymentMethods.length > 0) {
    return existingPaymentMethods[0].stripeCustomerId;
  }

  const user = await UsersDAO.findById(userId);
  const customer = await createCustomer({ name: user.name, email: user.email });
  return customer.id;
}

module.exports = {
  charge,
  createCustomer,
  attachSource,
  findOrCreateCustomerId
};
