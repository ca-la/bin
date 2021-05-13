import Knex from "knex";
import uuid from "node-uuid";
import { omit } from "lodash";

import PaymentMethodsDAO from "./dao";
import attachSource from "../../services/stripe/attach-source";
import { findOrCreateCustomer } from "../../services/stripe";
import { PaymentMethod } from "./types";

type Options =
  | {
      token: string;
      userId: string;
      teamId: null;
      trx: Knex.Transaction;
    }
  | {
      token: string;
      userId: null;
      teamId: string;
      trx: Knex.Transaction;
    };

export default async function createPaymentMethod(
  options: Options
): Promise<PaymentMethod> {
  const { token, trx } = options;

  const {
    id: customerId,
    customerId: stripeCustomerId,
  } = await findOrCreateCustomer(trx, omit(options, "trx", "token"));

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
    customerId,
  });

  if (!method) {
    throw new Error("Unable to create payment method");
  }

  return method;
}
