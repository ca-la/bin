import uuid from "node-uuid";
import Knex from "knex";

import { BillingInterval, PlanDb } from "../../components/plans/types";
import {
  PlanStripePrice,
  PlanStripePriceType,
} from "../../components/plan-stripe-price/types";
import { createPlan } from "../../components/plans/create-plan";

export default async function generatePlan(
  trx: Knex.Transaction,
  options: Partial<PlanDb> = {},
  stripePrices: Omit<PlanStripePrice, "planId">[] = [
    { stripePriceId: "plan_123", type: PlanStripePriceType.BASE_COST },
  ]
) {
  return createPlan(
    trx,
    {
      id: uuid.v4(),
      billingInterval: BillingInterval.MONTHLY,
      monthlyCostCents: 1234,
      revenueShareBasisPoints: 1200,
      costOfGoodsShareBasisPoints: 0,
      stripePlanId: "plan_123",
      title: "A little Bit",
      isDefault: false,
      isPublic: false,
      ordering: null,
      description: null,
      baseCostPerBillingIntervalCents: 1234,
      perSeatCostPerBillingIntervalCents: 0,
      canSubmit: true,
      canCheckOut: true,
      maximumSeatsPerTeam: null,
      includesFulfillment: true,
      upgradeToPlanId: null,
      createdAt: new Date(),
      ...options,
    },
    stripePrices
  );
}
