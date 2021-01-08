import uuid from "node-uuid";

import findCollectionTeamPlans from "./find-collection-team-plans";
import { test, Test } from "../../test-helpers/fresh";
import generatePlan from "../../test-helpers/factories/plan";
import generateCollection from "../../test-helpers/factories/collection";
import db from "../../services/db";
import TeamsDAO from "../teams/dao";
import * as SubscriptionsDAO from "../subscriptions/dao";
import { TeamType } from "../teams/types";

test("findCollectionTeamPlans", async (t: Test) => {
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

    const teamPlans = await findCollectionTeamPlans(trx, collection.id);
    t.equal(teamPlans.length, 1);
    t.deepEqual(teamPlans[0], teamPlan);
  } finally {
    await trx.rollback();
  }
});
