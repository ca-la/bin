import Knex from "knex";
import uuid from "node-uuid";

import { sandbox, test, Test } from "../../test-helpers/fresh";
import db from "../../services/db";

import PartnerPayoutsDAO = require("../partner-payouts/dao");
import { rawDao as RawTeamUsersDAO } from "../team-users/dao";
import { Role as TeamUserRole } from "../team-users/types";
import TeamsDAO, { standardDao as TeamsStandardDAO } from "./dao";
import { SubscriptionsDAO } from "../subscriptions";
import { generateTeam } from "../../test-helpers/factories/team";
import createUser from "../../test-helpers/create-user";
import { generateDesign } from "../../test-helpers/factories/product-design";
import generateBid from "../../test-helpers/factories/bid";
import generateDesignEvent from "../../test-helpers/factories/design-event";
import generatePlan from "../../test-helpers/factories/plan";
import { SubscriptionWithPlan } from "../subscriptions/domain-object";
import * as CancelSubscriptionService from "../../services/stripe/cancel-subscription";

async function setup() {
  const { user } = await createUser();
  const { user: deletedTeamUser } = await createUser();
  const { user: designer } = await createUser();
  const { team, teamUser } = await generateTeam(user.id);
  await db.transaction(async (trx: Knex.Transaction) =>
    RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      teamId: team.id,
      userId: deletedTeamUser.id,
      userEmail: null,
      role: TeamUserRole.VIEWER,
      label: "",
      createdAt: new Date(),
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
  );
  const design = await generateDesign({ userId: designer.id });
  const { bid } = await generateBid({ bidOptions: { bidPriceCents: 10000 } });

  await generateDesignEvent({
    bidId: bid.id,
    targetTeamId: team.id,
    type: "ACCEPT_SERVICE_BID",
  });

  return { design, user, deletedTeamUser, team, bid, designer, teamUser };
}

test("TeamsDAO.findUnpaidTeams: finds unpaid teams", async (t: Test) => {
  const { team, bid, designer } = await setup();
  const trx = await db.transaction();

  try {
    t.deepEquals(
      await TeamsDAO.findUnpaidTeams(trx),
      [team],
      "Returns teams that have recieved no payment"
    );

    await PartnerPayoutsDAO.create(trx, {
      invoiceId: null,
      payoutAccountId: null,
      payoutAmountCents: 5000,
      message: "Half payment",
      initiatorUserId: designer.id,
      bidId: bid.id,
      isManual: true,
    });

    t.deepEquals(
      await TeamsDAO.findUnpaidTeams(trx),
      [team],
      "Returns teams that have recieved partial payment"
    );

    await PartnerPayoutsDAO.create(trx, {
      invoiceId: null,
      payoutAccountId: null,
      payoutAmountCents: 5000,
      message: "Other half",
      initiatorUserId: designer.id,
      bidId: bid.id,
      isManual: true,
    });

    t.deepEquals(
      await TeamsDAO.findUnpaidTeams(trx),
      [],
      "Does not return paid teams"
    );
  } finally {
    await trx.rollback();
  }
});

test("TeamsDAO.findUnpaidTeams: does not return removed teams", async (t: Test) => {
  const { team, bid } = await setup();
  const trx = await db.transaction();

  try {
    t.deepEquals(
      await TeamsDAO.findUnpaidTeams(trx),
      [team],
      "Returns team before being removed"
    );

    await generateDesignEvent({
      bidId: bid.id,
      targetTeamId: team.id,
      type: "REMOVE_PARTNER",
    });

    t.deepEquals(
      await TeamsDAO.findUnpaidTeams(trx),
      [],
      "Does not return removed team"
    );
  } finally {
    await trx.rollback();
  }
});

test("TeamsDAO.findUnpaidTeams: does not return deleted teams", async (t: Test) => {
  const { team } = await setup();
  const trx = await db.transaction();

  try {
    t.deepEquals(
      await TeamsDAO.find(trx, { id: team.id }),
      [team],
      "Returns team before being deleted"
    );

    await TeamsDAO.update(trx, team.id, { deletedAt: new Date() });

    t.deepEquals(
      await TeamsDAO.find(trx, { id: team.id }),
      [],
      "find does not return deleted team"
    );
    t.deepEquals(
      await TeamsDAO.findOne(trx, { id: team.id }),
      null,
      "findOne does not return deleted team"
    );
    t.deepEquals(
      await TeamsDAO.findById(trx, team.id),
      null,
      "findById does not return deleted team"
    );
  } finally {
    await trx.rollback();
  }
});

test("TeamsDAO.find: does not return deleted teams", async (t: Test) => {
  const { team } = await setup();
  const trx = await db.transaction();

  try {
    t.deepEquals(
      await TeamsDAO.find(trx, { id: team.id }),
      [team],
      "Returns team before being deleted"
    );

    await TeamsDAO.update(trx, team.id, { deletedAt: new Date() });

    t.deepEquals(
      await TeamsDAO.find(trx, { id: team.id }),
      [],
      "find does not return deleted team"
    );
    t.deepEquals(
      await TeamsDAO.findOne(trx, { id: team.id }),
      null,
      "findOne does not return deleted team"
    );
    t.deepEquals(
      await TeamsDAO.findById(trx, team.id),
      null,
      "findById does not return deleted team"
    );
  } finally {
    trx.rollback();
  }
});

test("TeamsDAO.findByUser: returns only related teams", async (t: Test) => {
  const { team, user, deletedTeamUser, teamUser } = await setup();
  const trx = await db.transaction();
  try {
    const { user: anotherUser } = await createUser();
    const { team: anotherTeam, teamUser: anotherTeamUser } = await generateTeam(
      anotherUser.id
    );

    t.deepEquals(
      await TeamsDAO.findByUser(trx, user.id),
      [{ ...team, role: teamUser.role, teamUserId: teamUser.id }],
      "Returns only initial team"
    );
    t.deepEquals(
      await TeamsDAO.findByUser(trx, anotherUser.id),
      [
        {
          ...anotherTeam,
          role: anotherTeamUser.role,
          teamUserId: anotherTeamUser.id,
        },
      ],
      "Returns only another team"
    );

    t.deepEquals(
      await TeamsDAO.findByUser(trx, deletedTeamUser.id),
      [],
      "Does not find teams for deleted team user"
    );
  } finally {
    trx.rollback();
  }
});

test("TeamsDAO.deleteTeam", async (t: Test) => {
  const trx = await db.transaction();
  try {
    const baseSubscription: SubscriptionWithPlan = {
      id: "s1",
      createdAt: new Date(),
      cancelledAt: null,
      planId: "p1",
      paymentMethodId: "pm1",
      stripeSubscriptionId: "stripe1",
      isPaymentWaived: false,
      userId: null,
      teamId: "t1",
      plan: await generatePlan(trx),
    };
    interface TestCase {
      title: string;
      subscriptions: SubscriptionWithPlan[];
      error?: string;
      cancelSubscriptionCalls: number;
      updateSubscriptionCalls: number;
      updateTeamCalls: number;
    }
    const testCases: TestCase[] = [
      {
        title: "With all subscriptions cancelled",
        subscriptions: [{ ...baseSubscription, cancelledAt: new Date() }],
        cancelSubscriptionCalls: 0,
        updateSubscriptionCalls: 0,
        updateTeamCalls: 1,
      },
      {
        title: "Two subscription are cancelled, another one is paid",
        subscriptions: [
          { ...baseSubscription, cancelledAt: new Date() },
          { ...baseSubscription, cancelledAt: new Date() },
          {
            ...baseSubscription,
            plan: {
              ...baseSubscription.plan,
              baseCostPerBillingIntervalCents: 1,
            },
          },
        ],
        cancelSubscriptionCalls: 0,
        updateSubscriptionCalls: 0,
        updateTeamCalls: 0,
        error:
          "Can't delete team while there is not cancelled paid subscription",
      },
      {
        title:
          "One subscription is cancelled, another one is free, third on doesn't have stripe id",
        subscriptions: [
          { ...baseSubscription, cancelledAt: new Date() },
          {
            ...baseSubscription,
            plan: {
              ...baseSubscription.plan,
              baseCostPerBillingIntervalCents: 0,
              perSeatCostPerBillingIntervalCents: 0,
            },
          },
          {
            ...baseSubscription,
            stripeSubscriptionId: null,
            plan: {
              ...baseSubscription.plan,
              baseCostPerBillingIntervalCents: 0,
              perSeatCostPerBillingIntervalCents: 0,
            },
          },
        ],
        cancelSubscriptionCalls: 1,
        updateSubscriptionCalls: 1,
        updateTeamCalls: 1,
      },
    ];
    const findSubscriptionsStub = sandbox().stub(
      SubscriptionsDAO,
      "findForTeamWithPlans"
    );
    const cancelSubscriptionStub = sandbox().stub(
      CancelSubscriptionService,
      "cancelSubscription"
    );
    const updateSubscriptionStub = sandbox().stub(SubscriptionsDAO, "update");
    const updateTeamStub = sandbox().stub(TeamsStandardDAO, "update");
    const { team } = await setup();
    for (const testCase of testCases) {
      cancelSubscriptionStub.reset();
      updateTeamStub.reset();
      updateSubscriptionStub.reset();

      findSubscriptionsStub.resolves(testCase.subscriptions);
      updateTeamStub.resolves({ updated: {} });
      try {
        await TeamsDAO.deleteById(trx, team.id);
        if (testCase.error) {
          t.fail(`${testCase.title}: expected to throw`);
        }
      } catch (err) {
        if (testCase.error) {
          t.is(err.message, testCase.error, `${testCase.title}: error`);
        } else {
          t.fail(`${testCase.title}: unexpected error: ${err.message}`);
        }
      }
      t.is(
        cancelSubscriptionStub.callCount,
        testCase.cancelSubscriptionCalls,
        `${testCase.title}: cancelSubscription`
      );
      t.is(
        updateTeamStub.callCount,
        testCase.updateTeamCalls,
        `${testCase.title}: update team`
      );
      t.is(
        updateSubscriptionStub.callCount,
        testCase.updateSubscriptionCalls,
        `${testCase.title}: update subscription`
      );
    }
  } finally {
    await trx.rollback();
  }
});
