'use strict';

const insecureHash = require('../insecure-hash');
const Logger = require('../logger');
const makeRequest = require('./make-request').default;
const PaymentMethodsDAO = require('../../components/payment-methods/dao');
const UsersDAO = require('../../components/users/dao');
const { requireValues } = require('../../services/require-properties');
const { STRIPE_SECRET_KEY } = require('../../config');

const STRIPE_CONNECT_API_BASE = 'https://connect.stripe.com';

const STRIPE_FEE_PERCENT = 0.029;
const STRIPE_FEE_BASE_CENTS = 30;

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

async function findOrCreateCustomerId(userId, trx) {
  const existingPaymentMethods = await PaymentMethodsDAO.findByUserId(
    userId,
    trx
  );
  if (existingPaymentMethods.length > 0) {
    return existingPaymentMethods[0].stripeCustomerId;
  }

  const user = await UsersDAO.findById(userId, trx);

  if (!user) {
    throw new Error(`Invalid user ID: ${user.id}`);
  }

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
  calculateStripeFee,
  charge,
  createConnectAccount,
  createCustomer,
  createLoginLink,
  findOrCreateCustomerId,
  sendTransfer
};
