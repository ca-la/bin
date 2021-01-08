import uuid from "node-uuid";
import Knex from "knex";

import * as PlansDAO from "../../components/plans/dao";
import { Plan, BillingInterval } from "../../components/plans/domain-object";

export default async function generatePlan(
  trx: Knex.Transaction,
  options?: Partial<Plan>
) {
  return PlansDAO.create(trx, {
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
    ...options,
  });
}
