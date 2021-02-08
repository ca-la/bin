import uuid from "node-uuid";
import Knex from "knex";

import * as PlansDAO from "../plans/dao";
import * as SubscriptionsDAO from "./dao";
import { Subscription } from "./domain-object";
import TeamUsersDAO from "../team-users/dao";
import InvalidDataError from "../../errors/invalid-data";
import upgradeStripeSubscription from "../../services/stripe/upgrade-subscription";
import InsufficientPlanError from "../../errors/insufficient-plan";
import createPaymentMethod from "../payment-methods/create-payment-method";

interface UpgradeTeamOptions {
  planId: string;
  teamId: string;
  userId: string;
  stripeCardToken: string;
}

export async function upgradeTeamSubscription(
  trx: Knex.Transaction,
  { planId, teamId, userId, stripeCardToken }: UpgradeTeamOptions
): Promise<Subscription> {
  const newPlan = await PlansDAO.findById(trx, planId);
  if (!newPlan) {
    throw new InvalidDataError(
      `Plan on which we want to upgrade to is not found with id: ${planId}`
    );
  }

  if (!newPlan.stripePrices.length) {
    throw new InvalidDataError(
      `Plan with id ${planId} doesn't have Stripe prices`
    );
  }

  const subscription = await SubscriptionsDAO.findActiveByTeamId(trx, teamId);

  if (!subscription) {
    throw new Error(
      `Team with id ${teamId} doesn't have an active subscription`
    );
  }

  if (!subscription.stripeSubscriptionId) {
    throw new Error(
      `Subscription with id ${subscription.id} doesn't have the subscription Stripe id`
    );
  }

  const previousPlan = await PlansDAO.findById(trx, subscription.planId);

  if (!previousPlan) {
    throw new Error(
      `The plan of current active subscription with id ${subscription.id} can not be found with id ${subscription.planId}`
    );
  }

  const isPreviusPlanFree =
    previousPlan.baseCostPerBillingIntervalCents === 0 &&
    previousPlan.perSeatCostPerBillingIntervalCents === 0;
  const isPlanFree =
    newPlan.baseCostPerBillingIntervalCents === 0 &&
    newPlan.perSeatCostPerBillingIntervalCents === 0;

  const isUpgradeFromPaidPlanToFree = !isPreviusPlanFree && isPlanFree;
  if (isUpgradeFromPaidPlanToFree) {
    throw new InsufficientPlanError(
      `Downgrade to a free plan (id ${newPlan.id}) is not supported`
    );
  }

  const paymentMethod = await createPaymentMethod({
    token: stripeCardToken,
    userId,
    trx,
  });

  // cancel current team subscription in our DB
  await SubscriptionsDAO.update(
    subscription.id,
    {
      cancelledAt: new Date(),
    },
    trx
  );

  // create new team subscription
  const newSubscription = SubscriptionsDAO.create(
    {
      cancelledAt: null,
      id: uuid.v4(),
      isPaymentWaived: subscription.isPaymentWaived,
      paymentMethodId: subscription.paymentMethodId,
      planId,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      userId: null,
      teamId,
    },
    trx
  );

  const seatCount = await TeamUsersDAO.countNonViewers(trx, teamId);
  // working with Stripe API after we finish with our DB
  // to make sure we won't make successful request and update in Stripe and then
  // graceful rollback in our DB on error.
  await upgradeStripeSubscription({
    subscription,
    newPlan,
    seatCount,
    stripeSourceId: paymentMethod.stripeSourceId,
  });

  return newSubscription;
}
