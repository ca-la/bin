import tape from "tape";
import uuid from "node-uuid";
import Knex from "knex";

import { test } from "../../test-helpers/fresh";
import createUser from "../../test-helpers/create-user";
import { generateTeam } from "../../test-helpers/factories/team";
import generatePlan from "../../test-helpers/factories/plan";
import TeamUsersDAO from "../team-users/dao";
import db from "../../services/db";
import * as SubscriptionsDAO from "./dao";
import { BillingInterval } from "../plans/types";
import { generatePaymentMethod } from "../../test-helpers/factories/payment-method";

test("SubscriptionsDAO supports creation and retrieval", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  await db.transaction(async (trx: Knex.Transaction) => {
    const { paymentMethod } = await generatePaymentMethod(trx, {
      userId: user.id,
      teamId: null,
    });
    const plan = await generatePlan(trx, {
      id: uuid.v4(),
      billingInterval: BillingInterval.MONTHLY,
      monthlyCostCents: 4567,
      costOfGoodsShareBasisPoints: 0,
      revenueShareBasisPoints: 1200,
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
      maximumCollections: null,
      includesFulfillment: true,
      upgradeToPlanId: null,
    });

    const subscription = await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: plan.id,
        paymentMethodId: paymentMethod.id,
        stripeSubscriptionId: "123",
        userId: user.id,
        teamId: null,
        isPaymentWaived: false,
      },
      trx
    );

    const found = await SubscriptionsDAO.findForUser(user.id, trx);
    t.equal(found.length, 1);
    t.equal(found[0].id, subscription.id);
  });
});

test("SubscriptionsDAO supports waiving payment on a new subscription", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  await db.transaction(async (trx: Knex.Transaction) => {
    const plan = await generatePlan(trx, {
      id: uuid.v4(),
      billingInterval: BillingInterval.MONTHLY,
      monthlyCostCents: 4567,
      costOfGoodsShareBasisPoints: 0,
      revenueShareBasisPoints: 1200,
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
      maximumCollections: null,
      includesFulfillment: true,
      upgradeToPlanId: null,
    });

    const subscription = await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: plan.id,
        paymentMethodId: null,
        stripeSubscriptionId: null,
        userId: user.id,
        teamId: null,
        isPaymentWaived: true,
      },
      trx
    );

    const found = await SubscriptionsDAO.findForUser(user.id, trx);
    t.equal(found.length, 1);
    t.equal(found[0].id, subscription.id);
    t.equal(found[0].isPaymentWaived, true);
  });
});

test("SubscriptionsDAO.findActive lists only active subscriptions", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  await db.transaction(async (trx: Knex.Transaction) => {
    const { paymentMethod } = await generatePaymentMethod(trx, {
      userId: user.id,
      teamId: null,
    });
    const plan = await generatePlan(trx, {
      id: uuid.v4(),
      billingInterval: BillingInterval.MONTHLY,
      monthlyCostCents: 4567,
      costOfGoodsShareBasisPoints: 0,
      revenueShareBasisPoints: 1200,
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
      maximumCollections: null,
      includesFulfillment: true,
      upgradeToPlanId: null,
    });

    await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: new Date("2000-01-01"),
        planId: plan.id,
        paymentMethodId: paymentMethod.id,
        stripeSubscriptionId: "123",
        userId: user.id,
        teamId: null,
        isPaymentWaived: false,
      },
      trx
    );

    const active1 = await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: plan.id,
        paymentMethodId: paymentMethod.id,
        stripeSubscriptionId: "123",
        userId: user.id,
        teamId: null,
        isPaymentWaived: false,
      },
      trx
    );

    const active2 = await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: new Date("3000-01-01"),
        planId: plan.id,
        paymentMethodId: paymentMethod.id,
        stripeSubscriptionId: "123",
        userId: user.id,
        teamId: null,
        isPaymentWaived: false,
      },
      trx
    );
    const { team } = await generateTeam(user.id);
    const { team: team2, teamUser: teamUser2 } = await generateTeam(user.id);
    await TeamUsersDAO.deleteById(trx, teamUser2.id);
    const { user: user2 } = await createUser({ withSession: false });
    const { team: team3 } = await generateTeam(user2.id);

    const active3 = await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: new Date("3000-01-01"),
        planId: plan.id,
        paymentMethodId: paymentMethod.id,
        stripeSubscriptionId: "123",
        userId: null,
        teamId: team.id,
        isPaymentWaived: false,
      },
      trx
    );

    // subscription for team2
    // not active since the team2 membership is dropped
    await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: new Date("3000-01-01"),
        planId: plan.id,
        paymentMethodId: paymentMethod.id,
        stripeSubscriptionId: "123",
        userId: null,
        teamId: team2.id,
        isPaymentWaived: false,
      },
      trx
    );

    // subscription for team3
    // not active since the team3 is created by user3
    // and user1 doesn't have membership in it
    await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: new Date("3000-01-01"),
        planId: plan.id,
        paymentMethodId: paymentMethod.id,
        stripeSubscriptionId: "123",
        userId: null,
        teamId: team3.id,
        isPaymentWaived: false,
      },
      trx
    );

    const found = await SubscriptionsDAO.findActive(user.id, trx);
    t.equal(found.length, 3);
    t.equal(found[0].id, active1.id);
    t.equal(found[1].id, active2.id);
    t.equal(found[2].id, active3.id);
  });
});

test("SubscriptionsDAO supports updating", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  await db.transaction(async (trx: Knex.Transaction) => {
    const { paymentMethod: pm1 } = await generatePaymentMethod(trx, {
      userId: user.id,
      teamId: null,
    });

    const { paymentMethod: pm2 } = await generatePaymentMethod(trx, {
      userId: user.id,
      teamId: null,
    });

    const plan = await generatePlan(trx, {
      id: uuid.v4(),
      billingInterval: BillingInterval.MONTHLY,
      monthlyCostCents: 4567,
      costOfGoodsShareBasisPoints: 0,
      revenueShareBasisPoints: 1200,
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
      maximumCollections: null,
      includesFulfillment: true,
      upgradeToPlanId: null,
    });

    const subscription = await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: plan.id,
        paymentMethodId: pm1.id,
        stripeSubscriptionId: "123",
        userId: user.id,
        teamId: null,
        isPaymentWaived: false,
      },
      trx
    );

    const updated = await SubscriptionsDAO.update(
      subscription.id,
      {
        paymentMethodId: pm2.id,
      },
      trx
    );

    t.equal(updated.paymentMethodId, pm2.id);
  });
});

test("findForTeamWithPlans", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const { team } = await generateTeam(user.id);

  await db.transaction(async (trx: Knex.Transaction) => {
    const plan = await generatePlan(trx, {
      id: uuid.v4(),
      billingInterval: BillingInterval.MONTHLY,
      monthlyCostCents: 4567,
      costOfGoodsShareBasisPoints: 0,
      revenueShareBasisPoints: 1200,
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
      maximumCollections: null,
      includesFulfillment: true,
      upgradeToPlanId: null,
    });

    const { paymentMethod: pm1 } = await generatePaymentMethod(trx, {
      userId: user.id,
      teamId: null,
    });
    const subscription = await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: new Date("3000-01-01"),
        planId: plan.id,
        paymentMethodId: pm1.id,
        stripeSubscriptionId: "123",
        teamId: team.id,
        userId: null,
        isPaymentWaived: false,
      },
      trx
    );

    const subscriptions = await SubscriptionsDAO.findForTeamWithPlans(
      trx,
      team.id
    );
    t.deepEqual(subscriptions, [
      {
        ...subscription,
        plan,
      },
    ]);
  });
});

test("findActiveByTeamId", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const { team } = await generateTeam(user.id);

  await db.transaction(async (trx: Knex.Transaction) => {
    const plan = await generatePlan(trx, { title: "Team Plan" });

    // cancelled subscription
    await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: new Date("2000-01-01"),
        planId: plan.id,
        paymentMethodId: null,
        stripeSubscriptionId: "123",
        teamId: team.id,
        userId: null,
        isPaymentWaived: false,
      },
      trx
    );

    const noActiveSubscription = await SubscriptionsDAO.findActiveByTeamId(
      trx,
      team.id
    );
    t.equal(noActiveSubscription, null, "active subscription is not found");

    const activeSubscription = await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: new Date("3000-01-01"),
        planId: plan.id,
        paymentMethodId: null,
        stripeSubscriptionId: "123",
        teamId: team.id,
        userId: null,
        isPaymentWaived: false,
      },
      trx
    );

    const subscription = await SubscriptionsDAO.findActiveByTeamId(
      trx,
      team.id
    );
    t.deepEqual(
      subscription,
      activeSubscription,
      "found active team subscription"
    );
  });
});
