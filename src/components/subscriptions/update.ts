import Knex from "knex";
import * as PlansDAO from "../plans/dao";
import * as SubscriptionsDAO from "./dao";
import createStripeSubscription from "../../services/stripe/create-subscription";
import createPaymentMethod from "../payment-methods/create-payment-method";
import InvalidDataError from "../../errors/invalid-data";

interface UpdateOptions {
  subscriptionId: string;
  planId: string;
  stripeCardToken: string | null;
  teamId: string;
  isPaymentWaived: boolean;
}

export async function updateSubscription(
  trx: Knex.Transaction,
  {
    isPaymentWaived,
    planId,
    stripeCardToken,
    subscriptionId,
    teamId,
  }: UpdateOptions
) {
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
      userId: null,
      teamId,
      trx,
    });

    stripeSubscription = await createStripeSubscription({
      stripeCustomerId: paymentMethod.stripeCustomerId,
      stripePrices: plan.stripePrices,
      stripeSourceId: paymentMethod.stripeSourceId,
      seatCount: null, // TODO: count non-viewer seats
    });
  }
  const stripeSubscriptionId = stripeSubscription
    ? stripeSubscription.id
    : null;
  const paymentMethodId = paymentMethod ? paymentMethod.id : null;

  return SubscriptionsDAO.update(
    subscriptionId,
    {
      paymentMethodId,
      planId,
      stripeSubscriptionId,
    },
    trx
  );
}
