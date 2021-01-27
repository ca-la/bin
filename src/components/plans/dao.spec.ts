import uuid from "node-uuid";

import { test, Test } from "../../test-helpers/fresh";
import db from "../../services/db";

import * as PlanStripePricesDAO from "../plan-stripe-price/dao";
import TeamsDAO from "../teams/dao";
import * as SubscriptionsDAO from "../subscriptions/dao";
import * as PlansDAO from "./dao";
import { Plan, BillingInterval } from "./types";
import generatePlan from "../../test-helpers/factories/plan";
import { TeamType } from "../teams/types";
import generateCollection from "../../test-helpers/factories/collection";
import createUser from "../../test-helpers/create-user";
import { PlanStripePriceType } from "../plan-stripe-price/types";

test("PlansDAO supports creation and retrieval", async (t: Test) => {
  const trx = await db.transaction();

  try {
    const plan1 = await PlansDAO.create(trx, {
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
    });

    await PlanStripePricesDAO.create(trx, {
      planId: plan1.id,
      stripePriceId: "a-stripe-price-id",
      type: PlanStripePriceType.BASE_COST,
    });

    await PlansDAO.create(trx, {
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
      includesFulfillment: true,
      upgradeToPlanId: plan1.id,
    });

    const p1Found = await PlansDAO.findById(trx, plan1.id);
    t.equal(p1Found && p1Found.title, "A little Bit", "finds by ID");
    t.deepEqual(
      p1Found!.stripePriceIds,
      ["a-stripe-price-id"],
      "joins any PlanStripePrices"
    );

    const plans = await PlansDAO.findAll(trx);

    t.equal(plans.length, 2, "finds all");
    const sorted = plans.sort(
      (a: Plan, b: Plan) =>
        a.baseCostPerBillingIntervalCents - b.baseCostPerBillingIntervalCents
    );
    t.equal(sorted[0].title, "A little Bit");
    t.equal(sorted[0].baseCostPerBillingIntervalCents, 1234);
    t.equal(sorted[0].revenueShareBasisPoints, 1200);
    t.equal(sorted[0].includesFulfillment, true);
    t.equal(sorted[1].title, "Some More");
    t.equal(sorted[1].baseCostPerBillingIntervalCents, 4567);
    t.equal(sorted[1].revenueShareBasisPoints, 5000);
    t.equal(sorted[1].upgradeToPlanId, plan1.id);
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
      includesFulfillment: true,
      upgradeToPlanId: null,
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
      includesFulfillment: true,
      upgradeToPlanId: null,
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
      includesFulfillment: true,
      upgradeToPlanId: null,
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
      includesFulfillment: true,
      upgradeToPlanId: null,
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
        includesFulfillment: true,
        upgradeToPlanId: null,
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
      includesFulfillment: true,
      upgradeToPlanId: null,
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
      includesFulfillment: true,
      upgradeToPlanId: null,
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
      includesFulfillment: true,
      upgradeToPlanId: null,
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
      includesFulfillment: true,
      upgradeToPlanId: null,
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

test("PlansDAO.findFreeDefault returns free default plan", async (t: Test) => {
  const trx = await db.transaction();

  const freeDefaultPlanId = uuid.v4();
  try {
    const freeDefaultPlan = await PlansDAO.create(trx, {
      id: freeDefaultPlanId,
      billingInterval: BillingInterval.MONTHLY,
      monthlyCostCents: 1234,
      revenueShareBasisPoints: 1200,
      costOfGoodsShareBasisPoints: 0,
      stripePlanId: "plan_123",
      title: "Free default plan",
      isDefault: true,
      isPublic: false,
      ordering: null,
      description: null,
      baseCostPerBillingIntervalCents: 0,
      perSeatCostPerBillingIntervalCents: 0,
      canSubmit: true,
      canCheckOut: true,
      maximumSeatsPerTeam: null,
      includesFulfillment: true,
      upgradeToPlanId: null,
    });

    await PlansDAO.create(trx, {
      id: uuid.v4(),
      billingInterval: BillingInterval.MONTHLY,
      monthlyCostCents: 4567,
      revenueShareBasisPoints: 5000,
      costOfGoodsShareBasisPoints: 0,
      stripePlanId: "plan_456",
      title: "Some More",
      isDefault: false,
      isPublic: false,
      ordering: null,
      description: null,
      baseCostPerBillingIntervalCents: 4567,
      perSeatCostPerBillingIntervalCents: 0,
      canSubmit: true,
      canCheckOut: true,
      maximumSeatsPerTeam: null,
      includesFulfillment: true,
      upgradeToPlanId: null,
    });

    const plan = await PlansDAO.findFreeAndDefaultForTeams(trx);
    t.deepEqual(plan, freeDefaultPlan, "Found free and default plan");
  } finally {
    await trx.rollback();
  }
});

test("PlansDAO.findCollectionTeamPlans", async (t: Test) => {
  const trx = await db.transaction();

  try {
    const teamPlan = await generatePlan(trx, { title: "Team Plan" });
    const userPlan = await generatePlan(trx, { title: "User Plan" });

    const team = await TeamsDAO.create(trx, {
      createdAt: new Date(),
      deletedAt: null,
      id: uuid.v4(),
      title: "A team",
      type: TeamType.DESIGNER,
    });

    const { collection, createdBy } = await generateCollection(
      {
        teamId: team.id,
      },
      trx
    );

    // Team's subscription
    await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: teamPlan.id,
        paymentMethodId: null,
        stripeSubscriptionId: "123",
        userId: null,
        teamId: team.id,
        isPaymentWaived: false,
      },
      trx
    );

    // An unrelated individual-user subscription
    await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: userPlan.id,
        paymentMethodId: null,
        stripeSubscriptionId: "123",
        userId: createdBy.id,
        teamId: null,
        isPaymentWaived: false,
      },
      trx
    );

    const teamPlans = await PlansDAO.findCollectionTeamPlans(
      trx,
      collection.id
    );
    t.equal(teamPlans.length, 1);
    t.deepEqual(teamPlans[0], teamPlan);
  } finally {
    await trx.rollback();
  }
});

test("PlansDAO.findTeamPlans", async (t: Test) => {
  const trx = await db.transaction();

  try {
    const teamPlan = await generatePlan(trx, { title: "Team Plan" });
    const userPlan = await generatePlan(trx, { title: "User Plan" });

    const team = await TeamsDAO.create(trx, {
      createdAt: new Date(),
      deletedAt: null,
      id: uuid.v4(),
      title: "A team",
      type: TeamType.DESIGNER,
    });

    // Team's subscription
    await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: teamPlan.id,
        paymentMethodId: null,
        stripeSubscriptionId: "123",
        userId: null,
        teamId: team.id,
        isPaymentWaived: false,
      },
      trx
    );

    // An unrelated individual-user subscription
    const { user } = await createUser({ withSession: false });
    await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: userPlan.id,
        paymentMethodId: null,
        stripeSubscriptionId: "123",
        userId: user.id,
        teamId: null,
        isPaymentWaived: false,
      },
      trx
    );

    const teamPlans = await PlansDAO.findTeamPlans(trx, team.id);
    t.equal(teamPlans.length, 1);
    t.deepEqual(teamPlans[0], teamPlan);
  } finally {
    await trx.rollback();
  }
});
