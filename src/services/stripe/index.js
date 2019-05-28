'use strict';

const fetch = require('node-fetch');
const qs = require('querystring');

const insecureHash = require('../insecure-hash');
const InvalidPaymentError = require('../../errors/invalid-payment');
const Logger = require('../logger');
const PaymentMethodsDAO = require('../../dao/payment-methods');
const StripeError = require('../../errors/stripe');
const UsersDAO = require('../../components/users/dao');
const { requireValues } = require('../../services/require-properties');
const { STRIPE_SECRET_KEY } = require('../../config');

const STRIPE_API_BASE = 'https://api.stripe.com/v1';
const STRIPE_CONNECT_API_BASE = 'https://connect.stripe.com';

const CREDENTIALS = Buffer.from(`${STRIPE_SECRET_KEY}:`).toString('base64');
const STRIPE_FEE_PERCENT = 0.029;
const STRIPE_FEE_BASE_CENTS = 30;

async function makeRequest({ method, path, apiBase, data, idempotencyKey }) {
  requireValues({ method, path });

  const base = apiBase || STRIPE_API_BASE;
  const url = `${base}${path}`;

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
    case 200:
      return json;
    case 402:
      throw new InvalidPaymentError(
        (json.error && json.error.message) || 'Your payment method was declined'
      );
    default:
      throw new StripeError(json.error);
  }
}

async function charge({
  customerId,
  sourceId,
  amountCents,
  description,
  invoiceId
}) {
  requireValues({
    customerId,
    sourceId,
    amountCents,
    description,
    invoiceId
  });

  // Using a combination of invoiceId + sourceId ensures that:
  // - We can't charge the same card for the same invoice twice in rapid succesion
  // - Switching sources lets you try again
  //
  // TBD if we need a better solution here but this seems ~fine for now.
  const idempotencyKey = insecureHash(
    `${invoiceId}/${sourceId}/${amountCents}`
  );

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

async function sendTransfer({
  destination,
  amountCents,
  description,
  invoiceId
}) {
  requireValues({
    destination,
    amountCents,
    description,
    invoiceId
  });

  const idempotencyKey = insecureHash(
    `${description}-${invoiceId}-${destination}`
  );

  return makeRequest({
    method: 'post',
    path: '/transfers',
    data: {
      amount: amountCents,
      currency: 'usd',
      destination,
      description,
      transfer_group: invoiceId
    },
    idempotencyKey
  });
}

async function createCustomer({ email, name }) {
  requireValues({ email, name });

  return makeRequest({
    method: 'post',
    path: '/customers',
    data: {
      email,
      description: name
    }
  });
}

async function attachSource({ customerId, cardToken }) {
  requireValues({ customerId, cardToken });

  return makeRequest({
    method: 'post',
    path: `/customers/${customerId}/sources`,
    data: {
      source: cardToken
    }
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

// https://stripe.com/docs/connect/express-accounts#token-request
async function createConnectAccount(authorizationCode) {
  requireValues({ authorizationCode });

  return makeRequest({
    apiBase: STRIPE_CONNECT_API_BASE,
    method: 'post',
    path: '/oauth/token',
    data: {
      client_secret: STRIPE_SECRET_KEY,
      grant_type: 'authorization_code',
      code: authorizationCode
    }
  });
}

async function createLoginLink({ accountId }) {
  requireValues({ accountId });

  try {
    const response = await makeRequest({
      method: 'post',
      path: `/accounts/${accountId}/login_links`
    });

    if (!response || !response.url) {
      Logger.log(response);
      throw new Error('Could not parse Stripe login URL from response');
    }

    return response.url;
  } catch (err) {
    if (err.message.indexOf('not an Express account') > -1) {
      return 'https://dashboard.stripe.com/';
    }

    throw err;
  }
}

// Will have to update this if we ever switch to an enterprise plan
function calculateStripeFee(totalCents) {
  return Math.round(STRIPE_FEE_PERCENT * totalCents + STRIPE_FEE_BASE_CENTS);
}

module.exports = {
  attachSource,
  calculateStripeFee,
  charge,
  createConnectAccount,
  createCustomer,
  createLoginLink,
  findOrCreateCustomerId,
  sendTransfer
};
