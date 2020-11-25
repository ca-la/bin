import uuid from "node-uuid";

import * as PlansDAO from "./dao";
import { Plan, BillingInterval } from "./domain-object";
import { test, Test } from "../../test-helpers/fresh";
import db from "../../services/db";

test("PlansDAO supports creation and retrieval", async (t: Test) => {
  const trx = await db.transaction();

  const p1id = uuid.v4();

  try {
    await PlansDAO.create(trx, {
      id: p1id,
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
    });

    await PlansDAO.create(trx, {
      id: uuid.v4(),
      billingInterval: BillingInterval.MONTHLY,
      monthlyCostCents: 4567,
      revenueShareBasisPoints: 5000,
      costOfGoodsShareBasisPoints: 0,
      stripePlanId: "plan_456",
      title: "Some More",
      isDefault: true,
      isPublic: false,
      ordering: null,
      description: null,
    });

    const p1Found = await PlansDAO.findById(trx, p1id);
    t.equal(p1Found && p1Found.title, "A little Bit", "finds by ID");

    const plans = await PlansDAO.findAll(trx);

    t.equal(plans.length, 2, "finds all");
    const sorted = plans.sort(
      (a: Plan, b: Plan) => a.monthlyCostCents - b.monthlyCostCents
    );
    t.equal(sorted[0].title, "A little Bit");
    t.equal(sorted[0].monthlyCostCents, 1234);
    t.equal(sorted[0].revenueShareBasisPoints, 1200);
    t.equal(sorted[1].title, "Some More");
    t.equal(sorted[1].monthlyCostCents, 4567);
    t.equal(sorted[1].revenueShareBasisPoints, 5000);
  } finally {
    await trx.rollback();
  }
});

test("PlansDAO.findPublic lists public plans", async (t: Test) => {
  const trx = await db.transaction();

  try {
    await PlansDAO.create(trx, {
      id: uuid.v4(),
      billingInterval: BillingInterval.MONTHLY,
      monthlyCostCents: 1234,
      revenueShareBasisPoints: 1200,
      costOfGoodsShareBasisPoints: 0,
      stripePlanId: "plan_123",
      title: "Second Public",
      isDefault: false,
      isPublic: true,
      ordering: 2,
      description: null,
    });

    await PlansDAO.create(trx, {
      id: uuid.v4(),
      billingInterval: BillingInterval.MONTHLY,
      monthlyCostCents: 1234,
      revenueShareBasisPoints: 1200,
      costOfGoodsShareBasisPoints: 0,
      stripePlanId: "plan_123",
      title: "First Private",
      isDefault: false,
      isPublic: false,
      ordering: null,
      description: null,
    });

    await PlansDAO.create(trx, {
      id: uuid.v4(),
      billingInterval: BillingInterval.MONTHLY,
      monthlyCostCents: 4567,
      revenueShareBasisPoints: 5000,
      costOfGoodsShareBasisPoints: 0,
      stripePlanId: "plan_456",
      title: "First Public",
      isDefault: true,
      isPublic: true,
      ordering: 1,
      description: null,
    });

    const plans = await PlansDAO.findPublic(trx);

    t.equal(plans.length, 2, "finds public plans");
    t.equal(plans[0].title, "First Public");
    t.equal(plans[0].ordering, 1);
    t.equal(plans[1].title, "Second Public");
    t.equal(plans[1].ordering, 2);
  } finally {
    await trx.rollback();
  }
});

test("PlansDAO.findById returns null if not found", async (t: Test) => {
  const trx = await db.transaction();
  try {
    const plan = await PlansDAO.findById(
      trx,
      "00000000-0000-0000-0000-000000000000"
    );
    t.equal(plan, null);
  } finally {
    await trx.rollback();
  }
});

test("PlansDAO prevents creating multiple default plans", async (t: Test) => {
  const trx = await db.transaction();

  try {
    await PlansDAO.create(trx, {
      id: uuid.v4(),
      billingInterval: BillingInterval.MONTHLY,
      monthlyCostCents: 1234,
      revenueShareBasisPoints: 1200,
      costOfGoodsShareBasisPoints: 0,
      stripePlanId: "plan_123",
      title: "A little Bit",
      isDefault: true,
      isPublic: false,
      ordering: null,
      description: null,
    });

    try {
      await PlansDAO.create(trx, {
        id: uuid.v4(),
        billingInterval: BillingInterval.MONTHLY,
        monthlyCostCents: 4567,
        revenueShareBasisPoints: 1200,
        costOfGoodsShareBasisPoints: 0,
        stripePlanId: "plan_456",
        title: "Some More",
        isDefault: true,
        isPublic: false,
        ordering: null,
        description: null,
      });
      throw new Error("Shouldn't get here");
    } catch (err) {
      t.equal(err.message, "Only one default plan can exist");
    }
  } finally {
    await trx.rollback();
  }
});
