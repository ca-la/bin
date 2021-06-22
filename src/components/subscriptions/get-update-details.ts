import Knex from "knex";

import * as PlansDAO from "../plans/dao";
import * as SubscriptionsDAO from "./dao";
import TeamUsersDAO from "../team-users/dao";
import InvalidDataError from "../../errors/invalid-data";
import { prepareUpgrade } from "../../services/stripe/upgrade-subscription";
import { logServerError } from "../../services/logger";
import { SubscriptionUpdateDetails } from "../teams/types";

import { attachTeamOptionData } from "./service";

interface UpgradeTeamOptions {
  planId: string;
  teamId: string;
}

export async function getTeamSubscriptionUpdateDetails(
  trx: Knex.Transaction,
  { planId, teamId }: UpgradeTeamOptions
): Promise<SubscriptionUpdateDetails> {
  const newPlan = await PlansDAO.findById(trx, planId);
  if (!newPlan) {
    logServerError(
      `Plan on which we want to upgrade to is not found with id: ${planId} | team id: ${teamId}`
    );
    throw new InvalidDataError(
      `Plan on which we want to upgrade to is not found`
    );
  }

  if (!newPlan.stripePrices.length) {
    throw new Error(`Plan with id ${planId} doesn't have Stripe prices`);
  }

  const seatCount = await TeamUsersDAO.countBilledUsers(trx, teamId);

  const teamPlan = attachTeamOptionData(newPlan, seatCount);

  const subscription = await SubscriptionsDAO.findActiveByTeamId(trx, teamId);

  if (!subscription) {
    return {
      proratedChargeCents: teamPlan.totalBillingIntervalCostCents,
      prorationDate: new Date(),
    };
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

  const isPreviousPlanFree =
    previousPlan.baseCostPerBillingIntervalCents === 0 &&
    previousPlan.perSeatCostPerBillingIntervalCents === 0;
  const isPlanFree =
    newPlan.baseCostPerBillingIntervalCents === 0 &&
    newPlan.perSeatCostPerBillingIntervalCents === 0;

  const isUpgradeFromPaidPlanToFree = !isPreviousPlanFree && isPlanFree;
  if (isUpgradeFromPaidPlanToFree) {
    return {
      proratedChargeCents: 0,
      prorationDate: new Date(),
    };
  }

  const { upcomingInvoice, updateRequest } = await prepareUpgrade({
    stripeSubscriptionId: subscription.stripeSubscriptionId,
    newPlan,
    seatCount,
  });

  if (!upcomingInvoice || updateRequest.proration_behavior === "none") {
    return {
      proratedChargeCents: 0,
      prorationDate: new Date(),
    };
  }

  return {
    proratedChargeCents: upcomingInvoice.total,
    prorationDate: upcomingInvoice.subscription_proration_date
      ? new Date(upcomingInvoice.subscription_proration_date)
      : new Date(),
  };
}
