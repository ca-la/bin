import uuid from "node-uuid";
import Knex from "knex";

import * as PlansDAO from "../plans/dao";
import * as SubscriptionsDAO from "./dao";
import TeamUsersDAO from "../team-users/dao";
import createStripeSubscription from "../../services/stripe/create-subscription";
import createPaymentMethod from "../payment-methods/create-payment-method";
import InvalidDataError from "../../errors/invalid-data";
import { findOrCreateCustomerId } from "../../services/stripe";

interface CreateOptions {
  planId: string;
  stripeCardToken: string | null;
  userId: string;
  teamId: string | null;
  isPaymentWaived: boolean;
}

export async function createSubscription(
  trx: Knex.Transaction,
  { planId, stripeCardToken, userId, teamId, isPaymentWaived }: CreateOptions
) {
  const plan = await PlansDAO.findById(trx, planId);
  if (!plan) {
    throw new InvalidDataError(`Invalid plan ID: ${planId}`);
  }

  let paymentMethod = null;
  const isPlanFree =
    isPaymentWaived ||
    (plan.baseCostPerBillingIntervalCents === 0 &&
      plan.perSeatCostPerBillingIntervalCents === 0);

  const seatCount = teamId
    ? await TeamUsersDAO.countNonViewers(trx, teamId)
    : null;

  if (!isPlanFree) {
    if (!stripeCardToken) {
      throw new InvalidDataError("Missing stripe card token");
    }

    paymentMethod = await createPaymentMethod({
      token: stripeCardToken,
      userId,
      trx,
    });
  }

  const stripeSubscription = await createStripeSubscription({
    stripeCustomerId: paymentMethod
      ? paymentMethod.stripeCustomerId
      : await findOrCreateCustomerId(userId, trx),
    stripeSourceId: paymentMethod ? paymentMethod.stripeSourceId : null,
    stripePrices: plan.stripePrices,
    seatCount,
  });

  const paymentMethodId = paymentMethod ? paymentMethod.id : null;

  return SubscriptionsDAO.create(
    {
      cancelledAt: null,
      id: uuid.v4(),
      isPaymentWaived: Boolean(isPaymentWaived),
      paymentMethodId,
      planId,
      stripeSubscriptionId: stripeSubscription.id,
      userId: teamId ? null : userId,
      teamId,
    },
    trx
  );
}
