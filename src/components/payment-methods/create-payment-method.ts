import * as Knex from 'knex';

import * as PaymentMethodsDAO from './dao';
import PaymentMethod = require('./domain-object');
import attachSource from '../../services/stripe/attach-source';
import { findOrCreateCustomerId } from '../../services/stripe';
interface Options {
  token: string;
  userId: string;
  trx: Knex.Transaction;
}

export default async function createPaymentMethod(
  options: Options
): Promise<PaymentMethod> {
  const { token, userId, trx } = options;

  const stripeCustomerId = await findOrCreateCustomerId(userId, trx);
  const source = await attachSource({
    cardToken: token,
    customerId: stripeCustomerId
  });

  const method = await PaymentMethodsDAO.create(
    {
      lastFourDigits: source.last4,
      stripeCustomerId,
      stripeSourceId: source.id,
      userId
    },
    trx
  );

  if (!method) {
    throw new Error('Unable to create payment method');
  }

  return method;
}
