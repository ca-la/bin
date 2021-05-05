import Knex from "knex";
import uuid from "node-uuid";

import PaymentMethodsDAO from "./dao";
import attachSource from "../../services/stripe/attach-source";
import { findOrCreateCustomerId } from "../../services/stripe";
import { PaymentMethod } from "./types";
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
    customerId: stripeCustomerId,
  });

  const method = await PaymentMethodsDAO.create(trx, {
    id: uuid.v4(),
    createdAt: new Date(),
    deletedAt: null,
    lastFourDigits: source.last4,
    stripeCustomerId,
    stripeSourceId: source.id,
    userId,
    customerId: null,
  });

  if (!method) {
    throw new Error("Unable to create payment method");
  }

  return method;
}
