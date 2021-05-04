import uuid from "node-uuid";
import Knex from "knex";

import db from "../../services/db";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import generatePricingValues from "../../test-helpers/factories/pricing-values";
import generatePricingQuote from "../../services/generate-pricing-quote";
import createUser from "../../test-helpers/create-user";
import DesignEventsDAO from "../design-events/dao";
import { generateDesign } from "../../test-helpers/factories/product-design";

import {
  create,
  findAcceptedByTargetId,
  findAll,
  findAllByQuoteAndTargetId,
  findByBidIdAndUser,
  findById,
  findByQuoteId,
  findOpenByTargetId,
  findRejectedByTargetId,
  findUnpaidByTeamId,
  findUnpaidByUserId,
} from "./dao";
import { templateDesignEvent } from "../design-events/types";
import generateBid from "../../test-helpers/factories/bid";
import generateDesignEvent from "../../test-helpers/factories/design-event";
import { daysToMs } from "../../services/time-conversion";
import { addDesign } from "../../test-helpers/collections";
import generateCollection from "../../test-helpers/factories/collection";
import { generateTeam } from "../../test-helpers/factories/team";
import PayoutAccountsDAO = require("../../dao/partner-payout-accounts");
import PartnerPayoutsDAO = require("../partner-payouts/dao");
import { rawDao as RawTeamUsersDAO } from "../team-users/dao";
import { Role as TeamUserRole } from "../team-users/types";
import { BidDb } from "./types";
import { MILLISECONDS_TO_EXPIRE } from "./constants";

const testDate = new Date();

async function setup() {
  const clock = sandbox().useFakeTimers(testDate);
  await generatePricingValues();
  const { user: admin } = await createUser({
    role: "ADMIN",
    withSession: false,
  });
  const { user: partner1 } = await createUser({
    role: "PARTNER",
    withSession: false,
  });
  const { user: partner2 } = await createUser({
    role: "PARTNER",
    withSession: false,
  });
  const { user: partner3 } = await createUser({
    role: "PARTNER",
    withSession: false,
  });
  const { user: designer1 } = await createUser({
    role: "ADMIN",
    withSession: false,
  });
  const { user: designer2 } = await createUser({
    role: "ADMIN",
    withSession: false,
  });
  const { team } = await generateTeam(partner1.id);
  await db.transaction((trx: Knex.Transaction) =>
    RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      role: TeamUserRole.VIEWER,
      label: null,
      teamId: team.id,
      userId: partner3.id,
      userEmail: null,
      createdAt: new Date(),
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
  );

  const payoutAccount1 = await PayoutAccountsDAO.create({
    id: uuid.v4(),
    createdAt: new Date(),
    deletedAt: null,
    userId: partner2.id,
    stripeAccessToken: "stripe-access-one",
    stripeRefreshToken: "stripe-refresh-one",
    stripePublishableKey: "stripe-publish-one",
    stripeUserId: "stripe-user-one",
  });

  const payoutAccount2 = await PayoutAccountsDAO.create({
    id: uuid.v4(),
    createdAt: new Date(),
    deletedAt: null,
    userId: partner2.id,
    stripeAccessToken: "stripe-access-one",
    stripeRefreshToken: "stripe-refresh-one",
    stripePublishableKey: "stripe-publish-one",
    stripeUserId: "stripe-user-one",
  });

  const d1 = await generateDesign({ userId: designer1.id });
  const d2 = await generateDesign({ userId: designer2.id });
  const { collection: c1 } = await generateCollection({
    createdBy: designer1.id,
  });
  const { collection: c2 } = await generateCollection({
    createdBy: designer2.id,
  });
  await addDesign(c1.id, d1.id);
  await addDesign(c2.id, d2.id);

  const q1 = await generatePricingQuote(
    {
      createdAt: testDate,
      deletedAt: null,
      expiresAt: null,
      id: uuid.v4(),
      minimumOrderQuantity: 1,
      designId: d1.id,
      materialBudgetCents: 1200,
      materialCategory: "BASIC",
      processes: [
        {
          complexity: "1_COLOR",
          name: "SCREEN_PRINTING",
        },
        {
          complexity: "1_COLOR",
          name: "SCREEN_PRINTING",
        },
      ],
      productComplexity: "SIMPLE",
      productType: "TEESHIRT",
      processTimelinesVersion: 0,
      processesVersion: 0,
      productMaterialsVersion: 0,
      productTypeVersion: 0,
      marginVersion: 0,
      constantsVersion: 0,
      careLabelsVersion: 0,
    },
    200
  );

  const q2 = await generatePricingQuote(
    {
      createdAt: testDate,
      deletedAt: null,
      expiresAt: null,
      id: uuid.v4(),
      minimumOrderQuantity: 1,
      designId: d2.id,
      materialBudgetCents: 1200,
      materialCategory: "BASIC",
      processes: [
        {
          complexity: "1_COLOR",
          name: "SCREEN_PRINTING",
        },
        {
          complexity: "1_COLOR",
          name: "SCREEN_PRINTING",
        },
      ],
      productComplexity: "SIMPLE",
      productType: "TEESHIRT",
      processTimelinesVersion: 0,
      processesVersion: 0,
      productMaterialsVersion: 0,
      productTypeVersion: 0,
      marginVersion: 0,
      constantsVersion: 0,
      careLabelsVersion: 0,
    },
    300
  );

  return {
    users: {
      admin,
      partner1,
      partner2,
      partner3,
      designer1,
      designer2,
    },
    team,
    payoutAccounts: [payoutAccount1, payoutAccount2],
    designs: [d1, d2],
    collections: [c1, c2],
    quotes: [q1, q2],
    clock,
  };
}

async function bidToPartner({
  designId,
  quoteId,
  actorId,
  targetId = null,
  targetTeamId = null,
}: {
  designId: string;
  quoteId: string;
  actorId: string;
  targetId?: string | null;
  targetTeamId?: string | null;
}) {
  const now = new Date();
  return db.transaction(async (trx: Knex.Transaction) => {
    const bid = await create(trx, {
      revenueShareBasisPoints: 10,
      bidPriceCents: 100000,
      bidPriceProductionOnlyCents: 0,
      createdBy: actorId,
      description: "Full Service",
      dueDate: new Date(now.getTime() + daysToMs(10)),
      id: uuid.v4(),
      quoteId,
      createdAt: now,
    });
    const bidEvent = await DesignEventsDAO.create(trx, {
      ...templateDesignEvent,
      type: "BID_DESIGN",
      actorId,
      designId,
      bidId: bid.id,
      targetId,
      targetTeamId,
      id: uuid.v4(),
      createdAt: now,
    });

    return {
      bid: await findById(trx, bid.id),
      bidEvent,
    };
  });
}

async function removePartner({
  bidId,
  designId,
  actorId,
  targetId = null,
  targetTeamId = null,
}: {
  bidId: string;
  designId: string;
  actorId: string;
  targetId?: string | null;
  targetTeamId?: string | null;
}) {
  return db.transaction((trx: Knex.Transaction) =>
    DesignEventsDAO.create(trx, {
      ...templateDesignEvent,
      type: "REMOVE_PARTNER",
      actorId,
      designId,
      bidId,
      id: uuid.v4(),
      createdAt: new Date(),
      targetId,
      targetTeamId,
    })
  );
}

async function rejectBid({
  bidId,
  designId,
  actorId,
}: {
  bidId: string;
  designId: string;
  actorId: string;
}) {
  return db.transaction((trx: Knex.Transaction) =>
    DesignEventsDAO.create(trx, {
      ...templateDesignEvent,
      type: "REJECT_SERVICE_BID",
      actorId,
      designId,
      bidId,
      id: uuid.v4(),
      createdAt: new Date(),
    })
  );
}

async function acceptBid({
  bidId,
  designId,
  actorId,
  targetTeamId = null,
}: {
  bidId: string;
  designId: string;
  actorId: string;
  targetTeamId?: string | null;
}) {
  return db.transaction((trx: Knex.Transaction) => {
    return DesignEventsDAO.create(trx, {
      ...templateDesignEvent,
      type: "ACCEPT_SERVICE_BID",
      actorId,
      designId,
      bidId,
      id: uuid.v4(),
      createdAt: new Date(),
      targetTeamId,
    });
  });
}

async function payPartner({
  payoutAccountId,
  payoutAmountCents,
  bidId,
  initiatorUserId,
}: {
  payoutAccountId: string | null;
  payoutAmountCents: number;
  bidId: string;
  initiatorUserId: string;
}) {
  return await db.transaction((trx: Knex.Transaction) =>
    PartnerPayoutsDAO.create(trx, {
      invoiceId: null,
      payoutAccountId,
      payoutAmountCents,
      message: "Get yo money",
      initiatorUserId,
      bidId,
      isManual: !payoutAccountId,
    })
  );
}

test("Bids DAO supports creation and retrieval", async (t: Test) => {
  const {
    quotes: [quote],
    users: { admin },
  } = await setup();

  const now = new Date();
  const bidId = uuid.v4();
  const inputBid: BidDb = {
    bidPriceCents: 100000,
    bidPriceProductionOnlyCents: 0,
    createdAt: now,
    createdBy: admin.id,
    description: "Full Service",
    dueDate: new Date(quote.createdAt.getTime() + daysToMs(10)),
    id: bidId,
    quoteId: quote.id,
    revenueShareBasisPoints: 10,
  };
  await db.transaction(async (trx: Knex.Transaction) => {
    const bid = await create(trx, inputBid);
    const retrieved = await findById(trx, inputBid.id);

    t.deepEqual(
      bid,
      {
        ...inputBid,
        acceptedAt: null,
        assignee: null,
      },
      "created bid should set acceptedAt"
    );
    t.deepEqual(bid, retrieved, "created bid should match found bid");

    const missed = await findById(trx, uuid.v4());

    t.equal(missed, null, "returns null with a lookup-miss");
  });
});

test("Bids DAO supports retrieval of subset of bids", async (t: Test) => {
  const {
    clock,
    users: { admin, partner1, partner2, partner3 },
    designs: [design1, design2],
    team,
    payoutAccounts: [, payoutAccount2],
    quotes: [quote1, quote2],
  } = await setup();

  clock.setSystemTime(new Date(testDate.getTime() - MILLISECONDS_TO_EXPIRE));
  const { bid: expired, bidEvent: deExpiredBid } = await bidToPartner({
    designId: design1.id,
    quoteId: quote1.id,
    actorId: admin.id,
    targetId: partner1.id,
  });
  clock.setSystemTime(testDate);

  const { bid: removed, bidEvent: deRemovedBid } = await bidToPartner({
    designId: design1.id,
    quoteId: quote1.id,
    actorId: admin.id,
    targetId: partner1.id,
  });
  clock.tick(1000);
  const deRemovedRemove = await removePartner({
    actorId: admin.id,
    bidId: removed!.id,
    designId: design1.id,
    targetId: partner1.id,
  });

  clock.tick(1000);
  const { bid: teamBid, bidEvent: deTeamBid } = await bidToPartner({
    designId: design1.id,
    quoteId: quote1.id,
    actorId: admin.id,
    targetTeamId: team.id,
  });

  clock.tick(1000);
  const { bid: open1, bidEvent: deOpen1Bid } = await bidToPartner({
    designId: design1.id,
    quoteId: quote1.id,
    actorId: admin.id,
    targetId: partner1.id,
  });
  clock.tick(1000);
  const { bid: open2, bidEvent: deOpen2Bid } = await bidToPartner({
    designId: design2.id,
    quoteId: quote2.id,
    actorId: admin.id,
    targetId: partner1.id,
  });
  clock.tick(1000);
  const { bid: open3, bidEvent: deOpen3Bid } = await bidToPartner({
    designId: design2.id,
    quoteId: quote2.id,
    actorId: admin.id,
    targetId: partner2.id,
  });

  clock.tick(1000);
  const { bid: rejectedBid, bidEvent: deRejectedBid } = await bidToPartner({
    designId: design2.id,
    quoteId: quote2.id,
    actorId: admin.id,
    targetId: partner1.id,
  });
  clock.tick(1000);
  const deRejectedReject = await rejectBid({
    bidId: rejectedBid!.id,
    designId: design2.id,
    actorId: partner1.id,
  });

  clock.tick(1000);
  const { bid: accepted1, bidEvent: deAccepted1Bid } = await bidToPartner({
    designId: design2.id,
    quoteId: quote2.id,
    actorId: admin.id,
    targetId: partner2.id,
  });
  clock.tick(1000);
  const { bid: accepted2, bidEvent: deAccepted2Bid } = await bidToPartner({
    designId: design2.id,
    quoteId: quote2.id,
    actorId: admin.id,
    targetId: partner2.id,
  });

  const acceptedAt = new Date(testDate.getTime() + daysToMs(1));
  clock.setSystemTime(acceptedAt);
  const deAccepted1Accept = await acceptBid({
    bidId: accepted1!.id,
    designId: design2.id,
    actorId: partner2.id,
  });
  const deAccepted2Accept = await acceptBid({
    bidId: accepted2!.id,
    designId: design2.id,
    actorId: partner2.id,
  });

  clock.tick(daysToMs(1));
  await payPartner({
    payoutAccountId: payoutAccount2.id,
    payoutAmountCents: accepted1!.bidPriceCents,
    bidId: accepted1!.id,
    initiatorUserId: admin.id,
  });
  await payPartner({
    payoutAccountId: payoutAccount2.id,
    payoutAmountCents: accepted2!.bidPriceCents - 1,
    bidId: accepted2!.id,
    initiatorUserId: admin.id,
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    t.deepEqual(
      await findOpenByTargetId(trx, partner1.id, "ACCEPTED"),
      [open2, open1, teamBid, expired],
      "findOpenByTargetId / returns open bids only assigned to this user / partner1"
    );
    t.deepEqual(
      await findOpenByTargetId(trx, partner2.id, "ACCEPTED"),
      [open3],
      "findOpenByTargetId / returns open bids only assigned to this user / partner2"
    );

    t.deepEqual(
      await findAcceptedByTargetId(trx, partner1.id, "ACCEPTED"),
      [],
      "findAcceptedByTargetId / returns accepted bids assign to this user / partner1"
    );
    t.deepEqual(
      await findAcceptedByTargetId(trx, partner2.id, "ACCEPTED"),
      [
        { ...accepted2, acceptedAt },
        { ...accepted1, acceptedAt },
      ],
      "findAcceptedByTargetId / returns accepted bids assign to this user / partner2"
    );

    t.deepEqual(
      await findRejectedByTargetId(trx, partner1.id, "ACCEPTED"),
      [rejectedBid],
      "findRejectedByTargetId / returns rejected bids assigned to this user / partner1"
    );
    t.deepEqual(
      await findRejectedByTargetId(trx, partner2.id, "ACCEPTED"),
      [],
      "findRejectedByTargetId / returns rejected bids assigned to this user / partner2"
    );

    t.deepEqual(
      await findByQuoteId(trx, quote1.id),
      [open1, teamBid, { ...removed, assignee: null }, expired],
      "findByQuoteId / returns all bids by quote ID / quote1"
    );
    t.deepEqual(
      await findByQuoteId(trx, quote2.id),
      [
        { ...accepted2, acceptedAt },
        { ...accepted1, acceptedAt },
        rejectedBid,
        open3,
        open2,
      ],
      "findByQuoteId / returns all bids by quote ID / quote2"
    );

    t.deepEqual(
      await findAll(trx, {}),
      [
        { ...accepted2, acceptedAt },
        { ...accepted1, acceptedAt },
        rejectedBid,
        open3,
        open2,
        open1,
        teamBid,
        { ...removed, assignee: null },
        expired,
      ],
      "findAll / returns all bids / no limit or offset"
    );

    t.deepEqual(
      await findAll(trx, { limit: 2 }),
      [
        { ...accepted2, acceptedAt },
        { ...accepted1, acceptedAt },
      ],
      "findAll / returns all bids / with limit no offset"
    );

    t.deepEqual(
      await findAll(trx, { offset: 2 }),
      [
        rejectedBid,
        open3,
        open2,
        open1,
        teamBid,
        { ...removed, assignee: null },
        expired,
      ],
      "findAll / returns all bids / with offset no limit"
    );

    t.deepEqual(
      await findAll(trx, { offset: 2, limit: 2 }),
      [rejectedBid, open3],
      "findAll / returns all bids / with offset and limit"
    );

    t.deepEqual(
      await findAll(trx, { state: "OPEN" }),
      [open3, open2, open1, teamBid],
      "findAll / returns filtered bids / state: OPEN"
    );

    t.deepEqual(
      await findAll(trx, { state: "ACCEPTED" }),
      [
        { ...accepted2, acceptedAt },
        { ...accepted1, acceptedAt },
      ],
      "findAll / returns filtered bids / state: ACCEPTED"
    );

    t.deepEqual(
      await findAll(trx, { state: "REJECTED" }),
      [rejectedBid],
      "findAll / returns filtered bids / state: REJECTED"
    );

    t.deepEqual(
      await findAll(trx, { state: "EXPIRED" }),
      [expired],
      "findAll / returns filtered bids / state: EXPIRED"
    );

    t.deepEqual(
      await findAllByQuoteAndTargetId(trx, quote1.id, partner1.id),
      [
        { ...open1, designEvents: [deOpen1Bid] },
        { ...teamBid, designEvents: [] },
        {
          ...removed,
          assignee: null,
          designEvents: [deRemovedBid, deRemovedRemove],
        },
        { ...expired, designEvents: [deExpiredBid] },
      ],
      "findAllByQuoteAndTargetId / returns quote's bids with filtered design events / quote1 partner1"
    );

    t.deepEqual(
      await findAllByQuoteAndTargetId(trx, quote2.id, partner1.id),
      [
        { ...accepted2, acceptedAt, designEvents: [] },
        { ...accepted1, acceptedAt, designEvents: [] },
        { ...rejectedBid, designEvents: [deRejectedBid, deRejectedReject] },
        { ...open3, designEvents: [] },
        { ...open2, designEvents: [deOpen2Bid] },
      ],
      "findAllByQuoteAndTargetId / returns quote's bids with filtered design events / quote2 partner1"
    );

    t.deepEqual(
      await findAllByQuoteAndTargetId(trx, quote1.id, partner2.id),
      [
        { ...open1, designEvents: [] },
        { ...teamBid, designEvents: [] },
        { ...removed, assignee: null, designEvents: [] },
        { ...expired, designEvents: [] },
      ],
      "findAllByQuoteAndTargetId / returns quote's bids with filtered design events / quote1 partner2"
    );

    t.deepEqual(
      await findAllByQuoteAndTargetId(trx, quote2.id, partner2.id),
      [
        {
          ...accepted2,
          acceptedAt,
          designEvents: [deAccepted2Bid, deAccepted2Accept],
        },
        {
          ...accepted1,
          acceptedAt,
          designEvents: [deAccepted1Bid, deAccepted1Accept],
        },
        { ...rejectedBid, designEvents: [] },
        { ...open3, designEvents: [deOpen3Bid] },
        { ...open2, designEvents: [] },
      ],
      "findAllByQuoteAndTargetId / returns quote's bids with filtered design events / quote2 partner2"
    );

    t.deepEqual(
      await findAllByQuoteAndTargetId(trx, quote1.id, team.id),
      [
        { ...open1, designEvents: [] },
        { ...teamBid, designEvents: [deTeamBid] },
        { ...removed, assignee: null, designEvents: [] },
        { ...expired, designEvents: [] },
      ],
      "findAllByQuoteAndTargetId / returns quote's bids with filtered design events / quote1 team"
    );

    t.deepEqual(
      await findAllByQuoteAndTargetId(trx, quote2.id, team.id),
      [
        { ...accepted2, acceptedAt, designEvents: [] },
        { ...accepted1, acceptedAt, designEvents: [] },
        { ...rejectedBid, designEvents: [] },
        { ...open3, designEvents: [] },
        { ...open2, designEvents: [] },
      ],
      "findAllByQuoteAndTargetId / returns quote's bids with filtered design events / quote2 team"
    );

    t.deepEqual(
      await findUnpaidByUserId(trx, partner1.id),
      [],
      "findUnpaidByUserId / returns unpaid bids by user ID / partner1"
    );

    t.deepEqual(
      await findUnpaidByUserId(trx, partner2.id),
      [{ ...accepted2, acceptedAt }],
      "findUnpaidByUserId / returns unpaid bids by user ID / partner2"
    );

    t.deepEqual(
      await findById(trx, open1!.id),
      {
        ...open1!,
        assignee: {
          type: "USER",
          id: partner1.id,
          name: partner1.name,
        },
      },
      "findById / returns bid"
    );

    t.deepEqual(
      await findById(trx, accepted1!.id),
      {
        ...accepted1,
        acceptedAt,
        assignee: {
          type: "USER",
          id: partner2.id,
          name: partner2.name,
        },
      },
      "findById / returns bid"
    );

    t.deepEqual(
      await findById(trx, accepted2!.id),
      {
        ...accepted2,
        acceptedAt,
        assignee: {
          type: "USER",
          id: partner2.id,
          name: partner2.name,
        },
      },
      "findById / returns bid"
    );

    t.deepEqual(
      await findByBidIdAndUser(trx, teamBid!.id, partner1.id),
      {
        ...teamBid,
        assignee: {
          type: "TEAM",
          id: team.id,
          name: team.title,
        },
      },
      "findByBidIdAndUser / returns bid to a team for team users"
    );

    t.deepEqual(
      await findByBidIdAndUser(trx, teamBid!.id, partner3.id),
      null,
      "findByBidIdAndUser / returns null if you are removed from a team"
    );

    t.deepEqual(
      await findByBidIdAndUser(trx, teamBid!.id, partner2.id),
      null,
      "findByBidIdAndUser / returns null if you are not in the team"
    );

    t.deepEqual(
      await findByBidIdAndUser(trx, open1!.id, partner1.id),
      {
        ...open1,
        assignee: {
          type: "USER",
          id: partner1.id,
          name: partner1.name,
        },
      },
      "findByBidIdAndUser / returns bid even if user has not accepted"
    );

    t.deepEqual(
      await findByBidIdAndUser(trx, accepted1!.id, partner2.id),
      {
        ...accepted1,
        acceptedAt,
        assignee: {
          type: "USER",
          id: partner2.id,
          name: partner2.name,
        },
      },
      "findByBidIdAndUser / returns bid if user has accepted the bid"
    );
  });
});

test("Bids DAO does not return unpaid bids the partner has been removed from", async (t: Test) => {
  sandbox().useFakeTimers(new Date(2020, 2, 1));
  const { user: designer } = await createUser();
  const { user: partner } = await createUser({ role: "PARTNER" });

  const design = await generateDesign({
    userId: designer.id,
  });

  const { collection } = await generateCollection({ createdBy: designer.id });
  await addDesign(collection.id, design.id);
  const { bid, user: admin } = await generateBid({
    bidOptions: {
      bidPriceCents: 5678,
      assignee: {
        type: "USER",
        id: partner.id,
      },
    },
    designId: design.id,
  });

  await generateDesignEvent({
    type: "ACCEPT_SERVICE_BID",
    bidId: bid.id,
    actorId: partner.id,
    designId: design.id,
    createdAt: new Date(2020, 1, 1),
  });
  await generateDesignEvent({
    actorId: admin.id,
    bidId: bid.id,
    createdAt: new Date(2020, 1, 1),
    designId: design.id,
    targetId: partner.id,
    type: "REMOVE_PARTNER",
  });

  const bids = await db.transaction((trx: Knex.Transaction) =>
    findUnpaidByUserId(trx, partner.id)
  );
  t.equal(bids.length, 0);
});

test("findUnpaidByTeamId", async () => {
  test("finds unpaid bids", async (t: Test) => {
    const {
      users: { admin, partner1 },
      team,
      designs: [design],
      quotes,
      clock,
    } = await setup();
    const acceptedAt = new Date(testDate.getTime() + daysToMs(1));
    clock.setSystemTime(acceptedAt);

    const { bid } = await bidToPartner({
      designId: design.id,
      quoteId: quotes[0].id,
      actorId: admin.id,
      targetTeamId: team.id,
    });
    await acceptBid({
      bidId: bid!.id,
      designId: design.id,
      actorId: partner1.id,
      targetTeamId: team.id,
    });

    await db.transaction(async (trx: Knex.Transaction) =>
      t.deepEquals(
        await findUnpaidByTeamId(trx, team.id),
        [
          {
            ...bid,
            acceptedAt,
            assignee: {
              id: team.id,
              name: team.title,
              type: "TEAM",
            },
          },
        ],
        "Returns bid that has recieved no payment"
      )
    );

    await payPartner({
      payoutAccountId: null,
      payoutAmountCents: bid!.bidPriceCents / 2,
      initiatorUserId: admin.id,
      bidId: bid!.id,
    });

    await db.transaction(async (trx: Knex.Transaction) =>
      t.deepEquals(
        await findUnpaidByTeamId(trx, team.id),
        [
          {
            ...bid,
            acceptedAt,
            assignee: {
              id: team.id,
              name: team.title,
              type: "TEAM",
            },
          },
        ],
        "Returns bid that has recieved partial payment"
      )
    );

    await payPartner({
      payoutAccountId: null,
      payoutAmountCents: bid!.bidPriceCents / 2,
      initiatorUserId: admin.id,
      bidId: bid!.id,
    });

    await db.transaction(async (trx: Knex.Transaction) =>
      t.deepEquals(
        await findUnpaidByTeamId(trx, team.id),
        [],
        "Does not return paid bids"
      )
    );
  });

  test("does not return bids the team was removed ", async (t: Test) => {
    const {
      users: { admin, partner1 },
      team,
      designs: [design],
      quotes,
      clock,
    } = await setup();
    const acceptedAt = new Date(testDate.getTime() + daysToMs(1));
    clock.setSystemTime(acceptedAt);

    const { bid } = await bidToPartner({
      designId: design.id,
      quoteId: quotes[0].id,
      actorId: admin.id,
      targetTeamId: team.id,
    });

    await acceptBid({
      bidId: bid!.id,
      designId: design.id,
      actorId: partner1.id,
      targetTeamId: team.id,
    });

    await db.transaction(async (trx: Knex.Transaction) =>
      t.deepEquals(
        await findUnpaidByTeamId(trx, team.id),
        [
          {
            ...bid,
            acceptedAt,
            assignee: {
              id: team.id,
              name: team.title,
              type: "TEAM",
            },
          },
        ],
        "Returns bid before being removed"
      )
    );

    await removePartner({
      bidId: bid!.id,
      designId: design.id,
      targetTeamId: team.id,
      actorId: admin.id,
    });

    await db.transaction(async (trx: Knex.Transaction) =>
      t.deepEquals(
        await findUnpaidByTeamId(trx, team.id),
        [],
        "Does not return removed bid"
      )
    );
  });
});
