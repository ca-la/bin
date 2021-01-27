import uuid from "node-uuid";

import {
  canCheckOutTeamCollection,
  canSubmitTeamCollection,
} from "./find-collection-team-plans";
import { test, Test } from "../../test-helpers/fresh";
import generatePlan from "../../test-helpers/factories/plan";
import generateCollection from "../../test-helpers/factories/collection";
import db from "../../services/db";
import TeamsDAO from "../teams/dao";
import * as SubscriptionsDAO from "../subscriptions/dao";
import { TeamType } from "../teams/types";

test("canCheckoutTeamCollection", async (t: Test) => {
  const trx = await db.transaction();

  try {
    const canCheckOut = await generatePlan(trx, {
      title: "Can check out",
      canCheckOut: true,
    });
    const cannotCheckOut = await generatePlan(trx, {
      title: "Cannot check out",
      canCheckOut: false,
    });

    const canTeam = await TeamsDAO.create(trx, {
      createdAt: new Date(),
      deletedAt: null,
      id: uuid.v4(),
      title: "Can",
      type: TeamType.DESIGNER,
    });
    const cannotTeam = await TeamsDAO.create(trx, {
      createdAt: new Date(),
      deletedAt: null,
      id: uuid.v4(),
      title: "Cannot",
      type: TeamType.DESIGNER,
    });

    await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: canCheckOut.id,
        paymentMethodId: null,
        stripeSubscriptionId: "123",
        userId: null,
        teamId: canTeam.id,
        isPaymentWaived: false,
      },
      trx
    );

    await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: cannotCheckOut.id,
        paymentMethodId: null,
        stripeSubscriptionId: "123",
        userId: null,
        teamId: cannotTeam.id,
        isPaymentWaived: false,
      },
      trx
    );

    const { collection: canCollection } = await generateCollection(
      { teamId: canTeam.id },
      trx
    );

    const { collection: cannotCollection } = await generateCollection(
      { teamId: cannotTeam.id },
      trx
    );

    t.true(await canCheckOutTeamCollection(trx, canCollection.id));
    t.false(await canCheckOutTeamCollection(trx, cannotCollection.id));
  } finally {
    await trx.rollback();
  }
});

test("canSubmitTeamCollection", async (t: Test) => {
  const trx = await db.transaction();

  try {
    const canSubmit = await generatePlan(trx, {
      title: "Can submit",
      canSubmit: true,
    });
    const cannotSubmit = await generatePlan(trx, {
      title: "Cannot submit",
      canSubmit: false,
    });

    const canTeam = await TeamsDAO.create(trx, {
      createdAt: new Date(),
      deletedAt: null,
      id: uuid.v4(),
      title: "Can",
      type: TeamType.DESIGNER,
    });
    const cannotTeam = await TeamsDAO.create(trx, {
      createdAt: new Date(),
      deletedAt: null,
      id: uuid.v4(),
      title: "Cannot",
      type: TeamType.DESIGNER,
    });

    await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: canSubmit.id,
        paymentMethodId: null,
        stripeSubscriptionId: "123",
        userId: null,
        teamId: canTeam.id,
        isPaymentWaived: false,
      },
      trx
    );

    await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: cannotSubmit.id,
        paymentMethodId: null,
        stripeSubscriptionId: "123",
        userId: null,
        teamId: cannotTeam.id,
        isPaymentWaived: false,
      },
      trx
    );

    const { collection: canCollection } = await generateCollection(
      { teamId: canTeam.id },
      trx
    );

    const { collection: cannotCollection } = await generateCollection(
      { teamId: cannotTeam.id },
      trx
    );

    t.true(await canSubmitTeamCollection(trx, canCollection.id));
    t.false(await canSubmitTeamCollection(trx, cannotCollection.id));
  } finally {
    await trx.rollback();
  }
});
