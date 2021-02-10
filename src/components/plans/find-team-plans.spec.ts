import uuid from "node-uuid";

import {
  areThereAvailableSeatsInTeamPlan,
  attachTeamOptionData,
} from "./find-team-plans";
import { test, Test } from "../../test-helpers/fresh";
import { Plan } from "./types";
import generatePlan from "../../test-helpers/factories/plan";
import db from "../../services/db";
import TeamsDAO from "../teams/dao";
import * as SubscriptionsDAO from "../subscriptions/dao";
import { TeamType } from "../teams/types";

test("areThereAvailableSeatsInTeamPlan returns true if at least one team plan has unlimited seat caps", async (t: Test) => {
  const trx = await db.transaction();

  try {
    const unlimitedPlan = await generatePlan(trx, {
      title: "Team Plan",
      maximumSeatsPerTeam: null,
    });
    const limitedPlan = await generatePlan(trx, {
      title: "Team Plan",
      maximumSeatsPerTeam: 1,
    });

    const team = await TeamsDAO.create(trx, {
      createdAt: new Date(),
      deletedAt: null,
      id: uuid.v4(),
      title: "A team",
      type: TeamType.DESIGNER,
    });

    await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: unlimitedPlan.id,
        paymentMethodId: null,
        stripeSubscriptionId: "123",
        userId: null,
        teamId: team.id,
        isPaymentWaived: false,
      },
      trx
    );

    await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: limitedPlan.id,
        paymentMethodId: null,
        stripeSubscriptionId: "123",
        userId: null,
        teamId: team.id,
        isPaymentWaived: false,
      },
      trx
    );
    const canAddTeamMember15 = await areThereAvailableSeatsInTeamPlan(
      trx,
      team.id,
      15
    );
    t.equal(canAddTeamMember15, true);
    const canAddTeamMember16 = await areThereAvailableSeatsInTeamPlan(
      trx,
      team.id,
      16
    );
    t.equal(canAddTeamMember16, true);
    const canAddTeamMember17 = await areThereAvailableSeatsInTeamPlan(
      trx,
      team.id,
      17
    );
    t.equal(canAddTeamMember17, true);
  } finally {
    await trx.rollback();
  }
});

test("areThereAvailableSeatsInTeamPlan for plans with limited seat caps", async (t: Test) => {
  const trx = await db.transaction();

  try {
    const limitedPlan1 = await generatePlan(trx, {
      title: "Team Plan",
      maximumSeatsPerTeam: 16,
    });
    const limitedPlan2 = await generatePlan(trx, {
      title: "Team Plan",
      maximumSeatsPerTeam: 1,
    });

    const team = await TeamsDAO.create(trx, {
      createdAt: new Date(),
      deletedAt: null,
      id: uuid.v4(),
      title: "A team",
      type: TeamType.DESIGNER,
    });

    await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: limitedPlan1.id,
        paymentMethodId: null,
        stripeSubscriptionId: "123",
        userId: null,
        teamId: team.id,
        isPaymentWaived: false,
      },
      trx
    );

    await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: limitedPlan2.id,
        paymentMethodId: null,
        stripeSubscriptionId: "123",
        userId: null,
        teamId: team.id,
        isPaymentWaived: false,
      },
      trx
    );

    const canAddTeamMember15 = await areThereAvailableSeatsInTeamPlan(
      trx,
      team.id,
      15
    );
    t.equal(
      canAddTeamMember15,
      true,
      "Plan with 16 seat caps allows to add team user for team with 15 members"
    );
    const canAddTeamMember16 = await areThereAvailableSeatsInTeamPlan(
      trx,
      team.id,
      16
    );
    t.equal(
      canAddTeamMember16,
      false,
      "Plan with 16 seat caps doesn't allow to add team user for team with 16 members"
    );
  } finally {
    await trx.rollback();
  }
});

test("areThereAvailableSeatsInTeamPlan allows to add new team user for CALA admin if there is no plans associated with the team", async (t: Test) => {
  const trx = await db.transaction();

  try {
    const isAdmin = true;
    const teamWithoutSubscription = await TeamsDAO.create(trx, {
      createdAt: new Date(),
      deletedAt: null,
      id: uuid.v4(),
      title: "A team",
      type: TeamType.DESIGNER,
    });

    const canAddTeamMemberAsAdmin = await areThereAvailableSeatsInTeamPlan(
      trx,
      teamWithoutSubscription.id,
      15,
      isAdmin
    );
    t.equal(
      canAddTeamMemberAsAdmin,
      true,
      "Plan with 16 seat caps allows to add team user for CALA admin"
    );

    const canAddTeamMemberAsRegularUser = await areThereAvailableSeatsInTeamPlan(
      trx,
      teamWithoutSubscription.id,
      15,
      false
    );
    t.equal(
      canAddTeamMemberAsRegularUser,
      false,
      "Plan with 16 seat caps allows to add team user for CALA admin"
    );
  } finally {
    await trx.rollback();
  }
});

test("attachTeamOptionData", async (t: Test) => {
  const plan = {
    billingInterval: "MONTHLY",
    baseCostPerBillingIntervalCents: 20,
    perSeatCostPerBillingIntervalCents: 100,
  } as Plan;

  t.deepEqual(attachTeamOptionData(plan, 5), {
    ...plan,
    billedUserCount: 5,
    totalBillingIntervalCostCents: 520,
  });
});
