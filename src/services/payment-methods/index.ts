import * as Knex from 'knex';
import * as PaymentMethodsDAO from '../../dao/payment-methods';
import Stripe = require('../../services/stripe');

export const createPaymentMethod = async (
  token: string,
  userId: string,
  trx?: Knex.Transaction
): Promise<string> => {
  const stripeCustomerId = await Stripe.findOrCreateCustomerId(userId);
  const source = await Stripe.attachSource({
    cardToken: token,
    customerId: stripeCustomerId
  });
  const method = await PaymentMethodsDAO.create({
    lastFourDigits: source.last4,
    stripeCustomerId,
    stripeSourceId: source.id,
    userId
  }, trx);
  if (!method) { throw new Error('Unable to create payment method'); }
  return method.id;
};
