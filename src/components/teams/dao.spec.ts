import { test, Test } from "../../test-helpers/fresh";
import db from "../../services/db";

import PartnerPayoutsDAO = require("../../components/partner-payouts/dao");
import { rawDao as RawTeamsDAO } from "./dao";
import { generateTeam } from "../../test-helpers/factories/team";
import createUser from "../../test-helpers/create-user";
import { generateDesign } from "../../test-helpers/factories/product-design";
import generateBid from "../../test-helpers/factories/bid";
import generateDesignEvent from "../../test-helpers/factories/design-event";
import uuid from "node-uuid";

test("RawTeamsDAO.findUnpaidTeams", async () => {
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

  test("finds unpaid teams", async (t: Test) => {
    const { team, bid, designer } = await setup();
    const trx = await db.transaction();

    try {
      t.deepEquals(
        await RawTeamsDAO.findUnpaidTeams(trx),
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
        await RawTeamsDAO.findUnpaidTeams(trx),
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
        await RawTeamsDAO.findUnpaidTeams(trx),
        [],
        "Does not return paid teams"
      );
    } finally {
      trx.rollback();
    }
  });

  test("does not return removed teams", async (t: Test) => {
    const { team, bid } = await setup();
    const trx = await db.transaction();

    try {
      t.deepEquals(
        await RawTeamsDAO.findUnpaidTeams(trx),
        [team],
        "Returns team before being removed"
      );

      await generateDesignEvent({
        bidId: bid.id,
        targetTeamId: team.id,
        type: "REMOVE_PARTNER",
      });

      t.deepEquals(
        await RawTeamsDAO.findUnpaidTeams(trx),
        [],
        "Does not return removed team"
      );
    } finally {
      trx.rollback();
    }
  });
});
