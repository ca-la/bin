import uuid from "node-uuid";
import Knex from "knex";

import * as PlansDAO from "../plans/dao";
import * as SubscriptionsDAO from "./dao";
import createStripeSubscription from "../../services/stripe/create-subscription";
import createPaymentMethod from "../payment-methods/create-payment-method";
import InvalidDataError from "../../errors/invalid-data";
import { Subscription } from "./domain-object";

interface Options {
  userId: string;
  planId: string;
  stripeCardToken?: string;
  subscriptionId?: string;
  isPaymentWaived?: boolean;
  trx: Knex.Transaction;
}

export default async function createOrUpdateSubscription(
  options: Options
): Promise<Subscription> {
  const {
    planId,
    stripeCardToken,
    subscriptionId,
    userId,
    isPaymentWaived,
    trx,
  } = options;

  const plan = await PlansDAO.findById(trx, planId);
  if (!plan) {
    throw new InvalidDataError(`Invalid plan ID: ${planId}`);
  }

  let paymentMethod = null;
  let stripeSubscription = null;
  const isPlanFree =
    isPaymentWaived ||
    (plan.baseCostPerBillingIntervalCents === 0 &&
      plan.perSeatCostPerBillingIntervalCents === 0);
  if (!isPlanFree) {
    if (!stripeCardToken) {
      throw new InvalidDataError("Missing stripe card token");
    }
    paymentMethod = await createPaymentMethod({
      token: stripeCardToken,
      userId,
      trx,
    });

    stripeSubscription = await createStripeSubscription({
      stripeCustomerId: paymentMethod.stripeCustomerId,
      stripePlanId: plan.stripePlanId,
      stripeSourceId: paymentMethod.stripeSourceId,
    });
  }
  const stripeSubscriptionId = stripeSubscription
    ? stripeSubscription.id
    : null;
  const paymentMethodId = paymentMethod ? paymentMethod.id : null;

  let subscription: Subscription;

  if (subscriptionId) {
    subscription = await SubscriptionsDAO.update(
      subscriptionId,
      {
        paymentMethodId,
        planId,
        stripeSubscriptionId,
      },
      trx
    );
  } else {
    subscription = await SubscriptionsDAO.create(
      {
        cancelledAt: null,
        id: uuid.v4(),
        isPaymentWaived: Boolean(isPaymentWaived),
        paymentMethodId,
        planId,
        stripeSubscriptionId,
        userId,
      },
      trx
    );
  }

  return subscription;
}
