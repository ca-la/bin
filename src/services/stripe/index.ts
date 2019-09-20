import * as Knex from 'knex';
import { insecureHash } from '../insecure-hash';
import * as Logger from '../logger';
import makeRequest from './make-request';
import * as PaymentMethodsDAO from '../../components/payment-methods/dao';
import * as UsersDAO from '../../components/users/dao';
import { STRIPE_SECRET_KEY } from '../../config';

const STRIPE_CONNECT_API_BASE = 'https://connect.stripe.com';

interface StripeChargeOptions {
  customerId: string;
  sourceId: string;
  amountCents: number;
  description: string;
  invoiceId: string;
}

export async function charge(options: StripeChargeOptions): Promise<object> {
  const { customerId, sourceId, amountCents, description, invoiceId } = options;

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

interface StripeTransferOptions {
  destination: string;
  amountCents: number;
  description: string;
  bidId: string | null;
  invoiceId: string | null;
}

export async function sendTransfer(
  options: StripeTransferOptions
): Promise<object> {
  const { description, bidId, destination, amountCents, invoiceId } = options;
  if (!invoiceId && !bidId) {
    throw new Error(`A Bid or Invoice ID is required`);
  }
  const idempotencyKey = insecureHash(
    `${description}-${bidId || invoiceId}-${destination}`
  );

  return makeRequest({
    method: 'post',
    path: '/transfers',
    data: {
      amount: amountCents,
      currency: 'usd',
      destination,
      description,
      transfer_group: bidId || invoiceId
    },
    idempotencyKey
  });
}

async function createCustomer({
  email,
  name
}: {
  email: string;
  name: string;
}): Promise<{ id: string }> {
  return makeRequest<{ id: string }>({
    method: 'post',
    path: '/customers',
    data: {
      email,
      description: name
    }
  });
}

export async function findOrCreateCustomerId(
  userId: string,
  trx: Knex.Transaction
): Promise<string> {
  const existingPaymentMethods = await PaymentMethodsDAO.findByUserId(
    userId,
    trx
  );
  if (existingPaymentMethods.length > 0) {
    return existingPaymentMethods[0].stripeCustomerId;
  }

  const user = await UsersDAO.findById(userId, trx);

  if (!user) {
    throw new Error(`Invalid user ID: ${userId}`);
  }
  if (!user.email) {
    throw new Error(
      `Email is required to create stripe customer for User ${user.id}`
    );
  }
  const customer = await createCustomer({ name: user.name, email: user.email });
  return customer.id;
}

// https://stripe.com/docs/connect/express-accounts#token-request
export async function createConnectAccount(
  authorizationCode: string
): Promise<object> {
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

export async function createLoginLink(accountId: string): Promise<string> {
  try {
    const response = await makeRequest<{ url: string }>({
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
