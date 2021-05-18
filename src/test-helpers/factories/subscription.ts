import Knex from "knex";
import uuid from "node-uuid";

import { Subscription } from "../../components/subscriptions";
import * as PlansDAO from "../../components/plans/dao";
import * as SubscriptionsDAO from "../../components/subscriptions/dao";
import generatePlan from "./plan";
import { PlanDb } from "../../components/plans/types";

export async function generateSubscription(
  trx: Knex.Transaction,
  options: Partial<Subscription> = {},
  planOptions: Partial<PlanDb> = {}
) {
  const plan = options.planId
    ? await PlansDAO.findById(trx, options.planId)
    : await generatePlan(trx, planOptions);

  if (!plan) {
    throw new Error("Could not find the plan while creating a subscription");
  }

  const subscription = await SubscriptionsDAO.create(
    {
      cancelledAt: null,
      id: uuid.v4(),
      isPaymentWaived: false,
      paymentMethodId: null,
      planId: plan.id,
      stripeSubscriptionId: "a-stripe-id",
      teamId: null,
      userId: null,
      ...options,
    },
    trx
  );

  return { plan, subscription };
}
