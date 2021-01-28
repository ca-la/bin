import Knex from "knex";

import { sandbox, test, Test } from "../../test-helpers/fresh";
import * as PlanStripePricesDAO from "../plan-stripe-price/dao";
import * as PlansDAO from "./dao";
import { createPlan } from "./create-plan";
import { BillingInterval, Plan, PlanDb } from "./types";
import { PlanStripePriceType } from "../plan-stripe-price/types";

const plan: MaybeUnsaved<PlanDb> = {
  billingInterval: BillingInterval.ANNUALLY,
  baseCostPerBillingIntervalCents: 0,
  canCheckOut: true,
  canSubmit: true,
  costOfGoodsShareBasisPoints: 0,
  description: null,
  includesFulfillment: true,
  isDefault: false,
  isPublic: false,
  maximumSeatsPerTeam: 0,
  monthlyCostCents: 0,
  ordering: null,
  perSeatCostPerBillingIntervalCents: 0,
  revenueShareBasisPoints: 0,
  stripePlanId: "a-stripe-plan-id",
  title: "A plan",
  upgradeToPlanId: null,
};
const saved: Plan = {
  ...plan,
  id: "a-plan-id",
  createdAt: new Date(),
  stripePrices: [
    {
      planId: "a-plan-id",
      stripePriceId: "a-stripe-price-id",
      type: PlanStripePriceType.BASE_COST,
    },
    {
      planId: "a-plan-id",
      stripePriceId: "another-stripe-price-id",
      type: PlanStripePriceType.PER_SEAT,
    },
  ],
};

test("createPlan", async (t: Test) => {
  const createPricesStub = sandbox()
    .stub(PlanStripePricesDAO, "createAll")
    .resolves();
  const createPlanStub = sandbox()
    .stub(PlansDAO, "create")
    .resolves({
      ...saved,
      stripePriceIds: [],
    });
  const findPlanStub = sandbox().stub(PlansDAO, "findById").resolves(saved);
  const trxStub = (sandbox().stub() as unknown) as Knex.Transaction;

  const created = await createPlan(trxStub, plan, [
    { stripePriceId: "a-stripe-price-id", type: PlanStripePriceType.BASE_COST },
    {
      stripePriceId: "another-stripe-price-id",
      type: PlanStripePriceType.PER_SEAT,
    },
  ]);

  t.deepEqual(created, saved, "returns the PlansDAO.findById");

  t.deepEqual(createPricesStub.args, [
    [
      trxStub,
      [
        {
          planId: "a-plan-id",
          stripePriceId: "a-stripe-price-id",
          type: PlanStripePriceType.BASE_COST,
        },
        {
          planId: "a-plan-id",
          stripePriceId: "another-stripe-price-id",
          type: PlanStripePriceType.PER_SEAT,
        },
      ],
    ],
  ]);
  t.deepEqual(createPlanStub.args, [[trxStub, plan]]);
  t.deepEqual(findPlanStub.args, [[trxStub, "a-plan-id"]]);
});
