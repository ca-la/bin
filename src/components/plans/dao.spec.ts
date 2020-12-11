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
      baseCostPerBillingIntervalCents: 1234,
      perSeatCostPerBillingIntervalCents: 0,
      canSubmit: true,
      canCheckOut: true,
      maximumSeatsPerTeam: null,
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
      baseCostPerBillingIntervalCents: 4567,
      perSeatCostPerBillingIntervalCents: 0,
      canSubmit: true,
      canCheckOut: true,
      maximumSeatsPerTeam: null,
    });

    const p1Found = await PlansDAO.findById(trx, p1id);
    t.equal(p1Found && p1Found.title, "A little Bit", "finds by ID");

    const plans = await PlansDAO.findAll(trx);

    t.equal(plans.length, 2, "finds all");
    const sorted = plans.sort(
      (a: Plan, b: Plan) =>
        a.baseCostPerBillingIntervalCents - b.baseCostPerBillingIntervalCents
    );
    t.equal(sorted[0].title, "A little Bit");
    t.equal(sorted[0].baseCostPerBillingIntervalCents, 1234);
    t.equal(sorted[0].revenueShareBasisPoints, 1200);
    t.equal(sorted[1].title, "Some More");
    t.equal(sorted[1].baseCostPerBillingIntervalCents, 4567);
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
      baseCostPerBillingIntervalCents: 1234,
      perSeatCostPerBillingIntervalCents: 0,
      canSubmit: true,
      canCheckOut: true,
      maximumSeatsPerTeam: null,
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
      baseCostPerBillingIntervalCents: 1234,
      perSeatCostPerBillingIntervalCents: 0,
      canSubmit: true,
      canCheckOut: true,
      maximumSeatsPerTeam: null,
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
      baseCostPerBillingIntervalCents: 4567,
      perSeatCostPerBillingIntervalCents: 0,
      canSubmit: true,
      canCheckOut: true,
      maximumSeatsPerTeam: null,
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
      baseCostPerBillingIntervalCents: 1234,
      perSeatCostPerBillingIntervalCents: 0,
      canSubmit: true,
      canCheckOut: true,
      maximumSeatsPerTeam: null,
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
        baseCostPerBillingIntervalCents: 4567,
        perSeatCostPerBillingIntervalCents: 0,
        canSubmit: true,
        canCheckOut: true,
        maximumSeatsPerTeam: null,
      });
      throw new Error("Shouldn't get here");
    } catch (err) {
      t.equal(err.message, "Only one default plan can exist");
    }
  } finally {
    await trx.rollback();
  }
});

test("PlansDAO findAll retrive plans in correct order", async (t: Test) => {
  const trx = await db.transaction();

  try {
    const private3 = await PlansDAO.create(trx, {
      id: uuid.v4(),
      billingInterval: BillingInterval.MONTHLY,
      monthlyCostCents: 4567,
      revenueShareBasisPoints: 5000,
      costOfGoodsShareBasisPoints: 0,
      stripePlanId: "plan_456",
      title: "Should be fird in the order",
      isDefault: false,
      isPublic: false,
      ordering: null,
      description: null,
      baseCostPerBillingIntervalCents: 4567,
      perSeatCostPerBillingIntervalCents: 0,
      canSubmit: true,
      canCheckOut: true,
      maximumSeatsPerTeam: null,
    });

    const publicOrder2 = await PlansDAO.create(trx, {
      id: uuid.v4(),
      billingInterval: BillingInterval.MONTHLY,
      monthlyCostCents: 1234,
      revenueShareBasisPoints: 1200,
      costOfGoodsShareBasisPoints: 0,
      stripePlanId: "plan_123",
      title: "Should be second in the order",
      isDefault: false,
      isPublic: true,
      ordering: 2,
      description: null,
      baseCostPerBillingIntervalCents: 1234,
      perSeatCostPerBillingIntervalCents: 0,
      canSubmit: true,
      canCheckOut: true,
      maximumSeatsPerTeam: null,
    });

    const publicOrder1 = await PlansDAO.create(trx, {
      id: uuid.v4(),
      billingInterval: BillingInterval.MONTHLY,
      monthlyCostCents: 1234,
      revenueShareBasisPoints: 1200,
      costOfGoodsShareBasisPoints: 0,
      stripePlanId: "plan_123",
      title: "Should be first in the order",
      isDefault: false,
      isPublic: true,
      ordering: 1,
      description: null,
      baseCostPerBillingIntervalCents: 1234,
      perSeatCostPerBillingIntervalCents: 0,
      canSubmit: true,
      canCheckOut: true,
      maximumSeatsPerTeam: null,
    });

    const private4 = await PlansDAO.create(trx, {
      id: uuid.v4(),
      billingInterval: BillingInterval.MONTHLY,
      monthlyCostCents: 4567,
      revenueShareBasisPoints: 5000,
      costOfGoodsShareBasisPoints: 0,
      stripePlanId: "plan_456",
      title: "Should be last in the order",
      isDefault: false,
      isPublic: false,
      ordering: null,
      description: null,
      baseCostPerBillingIntervalCents: 4567,
      perSeatCostPerBillingIntervalCents: 0,
      canSubmit: true,
      canCheckOut: true,
      maximumSeatsPerTeam: null,
    });

    const plans = await PlansDAO.findAll(trx);

    t.equal(plans.length, 4, "finds all");
    const plansIds = plans.map(({ id }: Plan) => id);
    t.deepEqual(
      plansIds,
      [publicOrder1.id, publicOrder2.id, private3.id, private4.id],
      "Public plans ordered by ordering in asc and private by created_at in desc"
    );
  } finally {
    await trx.rollback();
  }
});
