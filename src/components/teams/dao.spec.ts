import { test, Test } from "../../test-helpers/fresh";
import db from "../../services/db";

import PartnerPayoutsDAO = require("../../components/partner-payouts/dao");
import TeamsDAO from "./dao";
import { generateTeam } from "../../test-helpers/factories/team";
import createUser from "../../test-helpers/create-user";
import { generateDesign } from "../../test-helpers/factories/product-design";
import generateBid from "../../test-helpers/factories/bid";
import generateDesignEvent from "../../test-helpers/factories/design-event";
import uuid from "node-uuid";

async function setup() {
  const { user } = await createUser();
  const { user: designer } = await createUser();
  const { team } = await generateTeam(user.id);
  const design = await generateDesign({ userId: designer.id });
  const { bid } = await generateBid({ bidOptions: { bidPriceCents: 10000 } });

  await generateDesignEvent({
    bidId: bid.id,
    targetTeamId: team.id,
    type: "ACCEPT_SERVICE_BID",
  });

  return { design, user, team, bid, designer };
}

test("TeamsDAO.findUnpaidTeams", async () => {
  test("finds unpaid teams", async (t: Test) => {
    const { team, bid, designer } = await setup();
    const trx = await db.transaction();

    try {
      t.deepEquals(
        await TeamsDAO.findUnpaidTeams(trx),
        [team],
        "Returns teams that have recieved no payment"
      );

      await PartnerPayoutsDAO.create(trx, {
        id: uuid.v4(),
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
        id: uuid.v4(),
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

  test("does not return removed teams", async (t: Test) => {
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

  test("does not return deleted teams", async (t: Test) => {
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
});

test("TeamsDAO.find", async () => {
  test("does not return deleted teams", async (t: Test) => {
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
});

test("TeamsDAO.findByUser", async () => {
  test("returns only related teams", async (t: Test) => {
    const { team, user } = await setup();
    const trx = await db.transaction();
    try {
      const { user: anotherUser } = await createUser();
      const { team: anotherTeam } = await generateTeam(anotherUser.id);

      t.deepEquals(
        await TeamsDAO.findByUser(trx, user.id),
        [team],
        "Returns only initial team"
      );
      t.deepEquals(
        await TeamsDAO.findByUser(trx, anotherUser.id),
        [anotherTeam],
        "Returns only another team"
      );
    } finally {
      trx.rollback();
    }
  });
});
