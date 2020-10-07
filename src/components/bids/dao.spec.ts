import uuid from "node-uuid";
import { omit } from "lodash";
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
  findActiveByTargetId,
  findAll,
  findAllByQuoteAndUserId,
  findById,
  findByQuoteId,
  findOpenByTargetId,
  findRejectedByTargetId,
  findUnpaidByUserId,
} from "./dao";
import DesignEvent, { templateDesignEvent } from "../design-events/types";
import generateBid from "../../test-helpers/factories/bid";
import generateDesignEvent from "../../test-helpers/factories/design-event";
import { daysToMs } from "../../services/time-conversion";
import { addDesign } from "../../test-helpers/collections";
import generateCollection from "../../test-helpers/factories/collection";
import PayoutAccountsDAO = require("../../dao/partner-payout-accounts");
import PartnerPayoutsDAO = require("../../components/partner-payouts/dao");
import { BidDb } from "./types";

const testDate = new Date(2012, 11, 22);

test("Bids DAO supports creation and retrieval", async (t: Test) => {
  sandbox().useFakeTimers(testDate);
  await generatePricingValues();
  const { user } = await createUser();
  const design = await generateDesign({ userId: user.id });
  const quote = await generatePricingQuote(
    {
      createdAt: testDate,
      deletedAt: null,
      expiresAt: null,
      id: uuid.v4(),
      minimumOrderQuantity: 1,
      designId: design.id,
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
  const now = new Date();
  const bidId = uuid.v4();
  const inputBid: BidDb = {
    bidPriceCents: 100000,
    bidPriceProductionOnlyCents: 0,
    createdAt: now,
    createdBy: user.id,
    description: "Full Service",
    dueDate: new Date(quote.createdAt.getTime() + daysToMs(10)),
    id: bidId,
    quoteId: quote.id,
    revenueShareBasisPoints: 10,
  };
  const bid = await db.transaction((trx: Knex.Transaction) =>
    create(trx, inputBid)
  );
  const retrieved = await findById(inputBid.id);

  t.deepEqual(bid, {
    acceptedAt: null,
    completedAt: null,
    ...inputBid,
  });
  t.deepEqual(bid, omit(retrieved, ["partnerPayoutLogs", "partnerUserId"]));
});

test("Bids DAO findById returns null with a lookup-miss", async (t: Test) => {
  const missed = await findById(uuid.v4());

  t.equal(missed, null);
});

test("Bids DAO supports retrieval by quote ID", async (t: Test) => {
  sandbox().useFakeTimers(testDate);
  await generatePricingValues();
  const { user } = await createUser();
  const design = await generateDesign({ userId: user.id });
  const quote = await generatePricingQuote(
    {
      createdAt: testDate,
      deletedAt: null,
      expiresAt: null,
      id: uuid.v4(),
      minimumOrderQuantity: 1,
      designId: design.id,
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
  const inputBid: BidDb = {
    revenueShareBasisPoints: 20,
    bidPriceCents: 100000,
    bidPriceProductionOnlyCents: 0,
    createdBy: user.id,
    description: "Full Service",
    dueDate: new Date(quote.createdAt.getTime() + daysToMs(10)),
    id: uuid.v4(),
    quoteId: quote.id,
    createdAt: new Date(),
  };
  await db.transaction((trx: Knex.Transaction) => create(trx, inputBid));
  const bids = await findByQuoteId(quote.id);

  t.deepEqual(
    bids,
    [{ acceptedAt: null, completedAt: null, ...inputBid }],
    "returns the bids in createdAt order"
  );
});

test("Bids DAO supports retrieval of bids by target ID and status", async (t: Test) => {
  const clock = sandbox().useFakeTimers(testDate);
  await generatePricingValues();
  const { user: designer } = await createUser();
  const { user: admin } = await createUser();
  const { user: partner } = await createUser();
  const { user: otherPartner } = await createUser();
  const design = await generateDesign({
    userId: designer.id,
  });

  const quote = await generatePricingQuote(
    {
      createdAt: testDate,
      deletedAt: null,
      expiresAt: null,
      id: uuid.v4(),
      minimumOrderQuantity: 1,
      designId: design.id,
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
  const openBid: BidDb = {
    revenueShareBasisPoints: 10,
    bidPriceCents: 100000,
    bidPriceProductionOnlyCents: 0,
    createdBy: admin.id,
    description: "Full Service",
    dueDate: new Date(quote.createdAt.getTime() + daysToMs(10)),
    id: uuid.v4(),
    quoteId: quote.id,
    createdAt: new Date(),
  };
  const rejectedBid: BidDb = {
    revenueShareBasisPoints: 20,
    bidPriceCents: 100000,
    bidPriceProductionOnlyCents: 0,
    createdBy: admin.id,
    description: "Full Service (Rejected)",
    dueDate: new Date(quote.createdAt.getTime() + daysToMs(10)),
    id: uuid.v4(),
    quoteId: quote.id,
    createdAt: new Date(),
  };
  const acceptedBid: BidDb = {
    revenueShareBasisPoints: 0,
    bidPriceCents: 110000,
    bidPriceProductionOnlyCents: 0,
    createdBy: admin.id,
    description: "Full Service (Accepted)",
    dueDate: new Date(quote.createdAt.getTime() + daysToMs(10)),
    id: uuid.v4(),
    quoteId: quote.id,
    createdAt: new Date(),
  };
  const rejectedDesign = await generateDesign({
    title: "A rejected design",
    userId: designer.id,
  });

  const submitEvent: DesignEvent = {
    ...templateDesignEvent,
    actorId: designer.id,
    createdAt: new Date(2012, 11, 23),
    designId: design.id,
    id: uuid.v4(),
    type: "SUBMIT_DESIGN",
  };

  const bidEvent: DesignEvent = {
    ...templateDesignEvent,
    actorId: admin.id,
    bidId: openBid.id,
    createdAt: new Date(2012, 11, 24),
    designId: design.id,
    id: uuid.v4(),
    targetId: partner.id,
    type: "BID_DESIGN",
  };
  const bidToOtherEvent: DesignEvent = {
    ...templateDesignEvent,
    actorId: admin.id,
    bidId: openBid.id,
    createdAt: new Date(2012, 11, 24),
    designId: design.id,
    id: uuid.v4(),
    targetId: otherPartner.id,
    type: "BID_DESIGN",
  };
  const bidDesignToRejectEvent: DesignEvent = {
    ...templateDesignEvent,
    actorId: admin.id,
    bidId: rejectedBid.id,
    createdAt: new Date(2012, 11, 24),
    designId: rejectedDesign.id,
    id: uuid.v4(),
    targetId: partner.id,
    type: "BID_DESIGN",
  };
  const bidDesignToAcceptEvent: DesignEvent = {
    ...templateDesignEvent,
    actorId: admin.id,
    bidId: acceptedBid.id,
    createdAt: new Date(2012, 11, 24),
    designId: design.id,
    id: uuid.v4(),
    targetId: partner.id,
    type: "BID_DESIGN",
  };

  const rejectDesignEvent: DesignEvent = {
    ...templateDesignEvent,
    actorId: partner.id,
    bidId: rejectedBid.id,
    createdAt: new Date(2012, 11, 25),
    designId: rejectedDesign.id,
    id: uuid.v4(),
    type: "REJECT_SERVICE_BID",
  };
  const acceptDesignEvent: DesignEvent = {
    ...templateDesignEvent,
    actorId: partner.id,
    bidId: acceptedBid.id,
    createdAt: new Date(2012, 11, 27),
    designId: design.id,
    id: uuid.v4(),
    type: "ACCEPT_SERVICE_BID",
  };
  const otherRejectEvent: DesignEvent = {
    ...templateDesignEvent,
    actorId: otherPartner.id,
    bidId: openBid.id,
    createdAt: new Date(2012, 11, 23),
    designId: design.id,
    id: uuid.v4(),
    type: "REJECT_SERVICE_BID",
  };

  await db.transaction(async (trx: Knex.Transaction) => {
    await create(trx, openBid);
    await create(trx, rejectedBid);
    await create(trx, acceptedBid);
    await DesignEventsDAO.createAll(trx, [
      submitEvent,
      bidEvent,
      bidToOtherEvent,
      otherRejectEvent,
      bidDesignToRejectEvent,
      bidDesignToAcceptEvent,
      rejectDesignEvent,
      acceptDesignEvent,
    ]);
  });

  const openBids = await findOpenByTargetId(partner.id, "ACCEPTED");
  const otherBids = await findOpenByTargetId(otherPartner.id, "ACCEPTED");

  t.deepEqual(
    openBids,
    [{ acceptedAt: null, completedAt: null, ...openBid }],
    "returns non-rejected/accepted bid"
  );
  t.deepEqual(otherBids, [], "returns no bids");

  const acceptedBids = await findAcceptedByTargetId(partner.id, "ACCEPTED");
  const activeBids = await findActiveByTargetId(partner.id, "ACCEPTED");
  clock.tick(1000);
  const otherAcceptedBids = await findAcceptedByTargetId(
    otherPartner.id,
    "ACCEPTED"
  );

  if (acceptedBids.length === 0) {
    throw new Error("No accepted bids found!");
  }
  if (activeBids.length === 0) {
    throw new Error("No active bids found!");
  }

  t.deepEqual(
    acceptedBids,
    [
      {
        ...acceptedBid,
        acceptedAt: acceptedBids[0].acceptedAt,
        completedAt: null,
      },
    ],
    "returns accepted bid"
  );
  t.deepEqual(
    activeBids,
    [
      {
        ...acceptedBid,
        acceptedAt: activeBids[0].acceptedAt,
        completedAt: null,
      },
    ],
    "returns active bid"
  );
  t.equal(
    (acceptedBids[0].createdAt as Date).toString(),
    new Date(2012, 11, 22).toString()
  );
  t.equal(
    (acceptedBids[0].acceptedAt as Date).toString(),
    new Date(2012, 11, 27).toString()
  );
  t.deepEqual(otherAcceptedBids, [], "returns no bids");

  const rejectedBids = await findRejectedByTargetId(partner.id, "ACCEPTED");
  const otherRejectedBids = await findRejectedByTargetId(
    otherPartner.id,
    "ACCEPTED"
  );

  t.deepEqual(
    rejectedBids,
    [{ acceptedAt: null, completedAt: null, ...rejectedBid }],
    "returns rejected bid"
  );
  t.deepEqual(
    otherRejectedBids,
    [{ acceptedAt: null, completedAt: null, ...openBid }],
    "returns rejected bid"
  );
});

test("findOpenByTargetId", async (t: Test) => {
  await generatePricingValues();
  const { user: partner } = await createUser();

  const { bid: b1 } = await generateBid({
    generatePricing: false,
    bidOptions: {
      assignee: {
        type: "USER",
        id: partner.id,
      },
    },
  });
  await generateDesignEvent({
    bidId: b1.id,
    targetId: partner.id,
    type: "REMOVE_PARTNER",
  });
  const { bid: b2 } = await generateBid({
    generatePricing: false,
    bidOptions: {
      assignee: {
        type: "USER",
        id: partner.id,
      },
    },
  });

  const openBids = await findOpenByTargetId(partner.id, "ACCEPTED");
  t.deepEqual(openBids, [b2], "Returns all open bids for the partner");
});

test("findAcceptedByTargetId", async (t: Test) => {
  sandbox().useFakeTimers(testDate);
  await generatePricingValues();
  const { user: partner } = await createUser();

  const { bid: b1 } = await generateBid({
    bidOptions: {
      assignee: {
        type: "USER",
        id: partner.id,
      },
    },
    generatePricing: false,
  });
  await generateDesignEvent({
    actorId: partner.id,
    bidId: b1.id,
    type: "ACCEPT_SERVICE_BID",
  });
  await generateDesignEvent({
    bidId: b1.id,
    targetId: partner.id,
    type: "REMOVE_PARTNER",
  });

  const { bid: b2 } = await generateBid({
    bidOptions: {
      dueDate: new Date(testDate.getTime() + daysToMs(2)).toISOString(),
      assignee: {
        type: "USER",
        id: partner.id,
      },
    },
    generatePricing: false,
  });
  const { bid: b3 } = await generateBid({
    bidOptions: {
      dueDate: new Date(testDate.getTime() + daysToMs(3)).toISOString(),
      assignee: {
        type: "USER",
        id: partner.id,
      },
    },
    generatePricing: false,
  });
  const { bid: b4 } = await generateBid({
    bidOptions: {
      dueDate: new Date(testDate.getTime() + daysToMs(4)).toISOString(),
      assignee: {
        type: "USER",
        id: partner.id,
      },
    },
    generatePricing: false,
  });

  const acceptDate1 = new Date(testDate.getTime() + daysToMs(1));
  await generateDesignEvent({
    actorId: partner.id,
    bidId: b4.id,
    type: "ACCEPT_SERVICE_BID",
    createdAt: acceptDate1,
  });
  const acceptDate2 = new Date(testDate.getTime() + daysToMs(2));
  await generateDesignEvent({
    actorId: partner.id,
    bidId: b2.id,
    type: "ACCEPT_SERVICE_BID",
    createdAt: acceptDate2,
  });
  const acceptDate3 = new Date(testDate.getTime() + daysToMs(12));
  await generateDesignEvent({
    actorId: partner.id,
    bidId: b3.id,
    type: "ACCEPT_SERVICE_BID",
    createdAt: acceptDate3,
  });

  const acceptedBids = await findAcceptedByTargetId(partner.id, "ACCEPTED");
  t.deepEqual(
    acceptedBids,
    [
      { ...b3, acceptedAt: acceptDate3 },
      { ...b2, acceptedAt: acceptDate2 },
      { ...b4, acceptedAt: acceptDate1 },
    ],
    "Returns all accepted bids for the partner"
  );

  const sortedByDueDate = await findAcceptedByTargetId(partner.id, "DUE");
  t.deepEqual(
    sortedByDueDate,
    [
      { ...b2, acceptedAt: acceptDate2 },
      { ...b3, acceptedAt: acceptDate3 },
      { ...b4, acceptedAt: acceptDate1 },
    ],
    "Returns all accepted bids for the partner sorted by Due Date"
  );
});

test("findRejectedByTargetId", async (t: Test) => {
  await generatePricingValues();
  const { user: partner } = await createUser();

  const { bid: b1 } = await generateBid({
    generatePricing: false,
    bidOptions: {
      assignee: {
        type: "USER",
        id: partner.id,
      },
    },
  });
  await generateDesignEvent({
    actorId: partner.id,
    bidId: b1.id,
    type: "REJECT_SERVICE_BID",
  });
  await generateDesignEvent({
    bidId: b1.id,
    targetId: partner.id,
    type: "REMOVE_PARTNER",
  });
  const { bid: b2 } = await generateBid({
    generatePricing: false,
    bidOptions: {
      assignee: {
        type: "USER",
        id: partner.id,
      },
    },
  });
  await generateDesignEvent({
    actorId: partner.id,
    bidId: b2.id,
    type: "REJECT_SERVICE_BID",
  });

  const rejectedBids = await findRejectedByTargetId(partner.id, "ACCEPTED");
  t.deepEqual(rejectedBids, [b2], "Returns all rejected bids for the partner");
});

test("Bids DAO supports finding all with a limit and offset", async (t: Test) => {
  const { bid: bid1 } = await generateBid();
  const { bid: bid2 } = await generateBid({ generatePricing: false });
  const { bid: bid3 } = await generateBid({ generatePricing: false });
  const { bid: bid4 } = await generateBid({ generatePricing: false });
  const { bid: bid5 } = await generateBid({ generatePricing: false });

  const result1 = await findAll({});
  t.deepEqual(
    result1,
    [bid5, bid4, bid3, bid2, bid1],
    "Returns all in desc order"
  );

  const result2 = await findAll({ limit: 2 });
  t.deepEqual(result2, [bid5, bid4], "Returns with a limit");

  const result3 = await findAll({ limit: 2, offset: 0 });
  t.deepEqual(result3, [bid5, bid4], "Returns with a limit and offset");

  const result4 = await findAll({ limit: 3, offset: 2 });
  t.deepEqual(result4, [bid3, bid2, bid1], "Returns with a limit and offset");
});

test("Bids DAO supports finding all bids by status", async (t: Test) => {
  const now = new Date();
  sandbox().useFakeTimers(now);
  const { user: partner } = await createUser({
    role: "PARTNER",
    withSession: false,
  });
  const { bid: openBid1 } = await generateBid({
    bidOptions: {
      assignee: {
        type: "USER",
        id: partner.id,
      },
    },
  });
  const fiftyHoursAgo = new Date(now.setHours(now.getHours() - 50));
  sandbox().useFakeTimers(fiftyHoursAgo);
  const { bid: openBid2 } = await generateBid({
    generatePricing: false,
    bidOptions: {
      assignee: {
        type: "USER",
        id: partner.id,
      },
    },
  });

  sandbox().useFakeTimers(now);
  const { bid: acceptedBid } = await generateBid({
    generatePricing: false,
    bidOptions: {
      assignee: {
        type: "USER",
        id: partner.id,
      },
    },
  });
  await generateDesignEvent({
    bidId: acceptedBid.id,
    type: "ACCEPT_SERVICE_BID",
  });
  sandbox().useFakeTimers(new Date("2019-01-15"));
  const { bid: acceptedBid2 } = await generateBid({
    generatePricing: false,
    bidOptions: {
      assignee: {
        type: "USER",
        id: partner.id,
      },
    },
  });
  sandbox().useFakeTimers(new Date("2019-01-16"));
  await generateDesignEvent({
    bidId: acceptedBid2.id,
    type: "ACCEPT_SERVICE_BID",
  });

  sandbox().useFakeTimers(new Date("2019-01-02"));
  const { bid: expiredBid } = await generateBid({
    generatePricing: false,
    bidOptions: {
      assignee: {
        type: "USER",
        id: partner.id,
      },
    },
  });

  sandbox().useFakeTimers(new Date("2019-02-05"));
  const { bid: rejectedBid } = await generateBid({
    generatePricing: false,
    bidOptions: {
      assignee: {
        type: "USER",
        id: partner.id,
      },
    },
  });
  sandbox().useFakeTimers(new Date("2019-02-06"));
  await generateDesignEvent({
    bidId: rejectedBid.id,
    type: "REJECT_SERVICE_BID",
  });

  const result1 = await findAll({ state: "OPEN" });
  t.deepEqual(result1, [openBid1, openBid2], "Only returns the open bids");

  const result2 = await findAll({ state: "ACCEPTED" });
  t.deepEqual(
    result2,
    [
      { ...acceptedBid, acceptedAt: result2[0].acceptedAt },
      { ...acceptedBid2, acceptedAt: result2[1].acceptedAt },
    ],
    "Only returns the accepted bids"
  );

  const result2a = await findAll({ limit: 1, offset: 1, state: "ACCEPTED" });
  t.deepEqual(
    result2a,
    [{ ...acceptedBid2, acceptedAt: result2a[0].acceptedAt }],
    "Only returns the accepted bids in the range"
  );

  await generateDesignEvent({
    bidId: acceptedBid.id,
    type: "REMOVE_PARTNER",
  });

  const result2b = await findAll({ state: "ACCEPTED" });
  t.deepEqual(
    result2b,
    [{ ...acceptedBid2, acceptedAt: result2b[0].acceptedAt }],
    "Only returns the accepted bids that were not removed"
  );

  const result3 = await findAll({ state: "EXPIRED" });
  t.deepEqual(result3, [expiredBid], "Only returns the expired bids");

  const result4 = await findAll({ state: "REJECTED" });
  t.deepEqual(result4, [rejectedBid], "Only returns the rejected bids");
});

test("Bids DAO supports finding by quote and user id with events", async (t: Test) => {
  sandbox().useFakeTimers(testDate);
  const { user: admin } = await createUser({
    role: "ADMIN",
    withSession: false,
  });
  const { user: designer } = await createUser({ withSession: false });
  const { user: partner } = await createUser({
    role: "PARTNER",
    withSession: false,
  });

  const design = await generateDesign({
    userId: designer.id,
  });
  await generatePricingValues();
  const quote = await generatePricingQuote(
    {
      createdAt: new Date(),
      deletedAt: null,
      expiresAt: null,
      id: uuid.v4(),
      minimumOrderQuantity: 1,
      designId: design.id,
      materialBudgetCents: 1200,
      materialCategory: "BASIC",
      processes: [],
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
  const openBid1 = await db.transaction((trx: Knex.Transaction) =>
    create(trx, {
      bidPriceCents: 100000,
      bidPriceProductionOnlyCents: 0,
      createdAt: new Date(),
      createdBy: admin.id,
      description: "Full Service",
      dueDate: new Date(new Date().getTime() + daysToMs(10)),
      id: uuid.v4(),
      quoteId: quote.id,
      revenueShareBasisPoints: 200,
    })
  );
  await generateDesignEvent({
    createdAt: new Date(),
    designId: design.id,
    targetId: designer.id,
    type: "COMMIT_COST_INPUTS",
  });
  await generateDesignEvent({
    actorId: designer.id,
    createdAt: new Date(),
    designId: design.id,
    type: "COMMIT_QUOTE",
  });
  const { designEvent: de1 } = await generateDesignEvent({
    bidId: openBid1.id,
    createdAt: new Date(),
    targetId: partner.id,
    type: "BID_DESIGN",
  });
  const openBid2 = await db.transaction((trx: Knex.Transaction) =>
    create(trx, {
      bidPriceCents: 100000,
      bidPriceProductionOnlyCents: 0,
      createdAt: new Date(),
      createdBy: admin.id,
      description: "Full Service",
      dueDate: new Date(new Date().getTime() + daysToMs(10)),
      id: uuid.v4(),
      quoteId: quote.id,
      revenueShareBasisPoints: 200,
    })
  );
  const openBid3 = await db.transaction((trx: Knex.Transaction) =>
    create(trx, {
      bidPriceCents: 100000,
      bidPriceProductionOnlyCents: 0,
      createdAt: new Date(),
      createdBy: admin.id,
      description: "Full Service",
      dueDate: new Date(new Date().getTime() + daysToMs(10)),
      id: uuid.v4(),
      quoteId: quote.id,
      revenueShareBasisPoints: 200,
    })
  );
  await generateDesignEvent({
    createdAt: new Date(),
    designId: design.id,
    targetId: designer.id,
    type: "COMMIT_COST_INPUTS",
  });
  await generateDesignEvent({
    actorId: designer.id,
    createdAt: new Date(),
    designId: design.id,
    type: "COMMIT_QUOTE",
  });
  const { designEvent: de3 } = await generateDesignEvent({
    bidId: openBid3.id,
    createdAt: new Date(),
    targetId: partner.id,
    type: "BID_DESIGN",
  });

  const acceptDate1 = new Date(testDate.getTime() + daysToMs(1));
  const { designEvent: de2 } = await generateDesignEvent({
    actorId: partner.id,
    bidId: openBid1.id,
    type: "ACCEPT_SERVICE_BID",
    createdAt: acceptDate1,
  });

  const acceptDate2 = new Date(testDate.getTime() + daysToMs(3));
  const { designEvent: de4 } = await generateDesignEvent({
    actorId: partner.id,
    bidId: openBid3.id,
    type: "ACCEPT_SERVICE_BID",
    createdAt: acceptDate2,
  });

  const result = await findAllByQuoteAndUserId(quote.id, partner.id);
  t.deepEqual(
    result,
    [
      {
        ...openBid3,
        acceptedAt: acceptDate2,
        designEvents: [de3, de4],
      },
      {
        ...openBid1,
        acceptedAt: acceptDate1,
        designEvents: [de1, de2],
      },
      {
        ...openBid2,
        acceptedAt: null,
        designEvents: [],
      },
    ],
    "Returns a list of bids with bid-specific events"
  );
});

test("Bids DAO supports finding all unpaid bids by user id from after the cutoff date", async (t: Test) => {
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
      bidPriceCents: 1000,
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
    createdAt: new Date(2019, 9, 1),
  });

  const { user: designer2 } = await createUser();

  const design2 = await generateDesign({
    userId: designer2.id,
  });
  const { bid: bid2 } = await generateBid({
    bidOptions: {
      bidPriceCents: 1000,
      assignee: {
        type: "USER",
        id: partner.id,
      },
    },
    designId: design2.id,
  });

  await generateDesignEvent({
    type: "ACCEPT_SERVICE_BID",
    bidId: bid2.id,
    actorId: partner.id,
    designId: design2.id,
    createdAt: new Date(2020, 1, 1),
  });

  const payoutAccount = await PayoutAccountsDAO.create({
    id: uuid.v4(),
    createdAt: new Date(),
    deletedAt: null,
    userId: partner.id,
    stripeAccessToken: "stripe-access-one",
    stripeRefreshToken: "stripe-refresh-one",
    stripePublishableKey: "stripe-publish-one",
    stripeUserId: "stripe-user-one",
  });

  const data = {
    id: uuid.v4(),
    invoiceId: null,
    payoutAccountId: payoutAccount.id,
    payoutAmountCents: 1000,
    message: "Get yo money",
    initiatorUserId: admin.id,
    bidId: bid2.id,
    isManual: false,
  };
  await db.transaction((trx: Knex.Transaction) =>
    PartnerPayoutsDAO.create(trx, data)
  );

  const bids = await findUnpaidByUserId(partner.id);
  t.equal(bids.length, 1);
  t.deepEqual(bids, [{ ...bid, acceptedAt: bids[0].acceptedAt }]);
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

  const bids = await findUnpaidByUserId(partner.id);
  t.equal(bids.length, 0);
});

test("Bids DAO supports finding bid with payout logs by id", async (t: Test) => {
  const clock = sandbox().useFakeTimers(testDate);
  const { user: designer } = await createUser({ withSession: false });
  const { user: partner } = await createUser({
    role: "PARTNER",
    withSession: false,
  });

  const design = await generateDesign({
    userId: designer.id,
  });
  const { bid, user: admin, quote } = await generateBid({
    bidOptions: {
      bidPriceCents: 2000,
      assignee: {
        type: "USER",
        id: partner.id,
      },
    },
    designId: design.id,
  });
  const payout1 = await db.transaction((trx: Knex.Transaction) =>
    PartnerPayoutsDAO.create(trx, {
      id: uuid.v4(),
      invoiceId: null,
      payoutAccountId: null,
      payoutAmountCents: 1000,
      message: "Get yo money",
      initiatorUserId: admin.id,
      bidId: bid.id,
      isManual: true,
    })
  );

  const payoutAccount = await PayoutAccountsDAO.create({
    id: uuid.v4(),
    createdAt: new Date(),
    deletedAt: null,
    userId: partner.id,
    stripeAccessToken: "stripe-access-one",
    stripeRefreshToken: "stripe-refresh-one",
    stripePublishableKey: "stripe-publish-one",
    stripeUserId: "stripe-user-one",
  });
  clock.tick(1000);
  const payout2 = await db.transaction((trx: Knex.Transaction) =>
    PartnerPayoutsDAO.create(trx, {
      id: uuid.v4(),
      invoiceId: null,
      payoutAccountId: payoutAccount.id,
      payoutAmountCents: 1000,
      message: "Get mo money",
      initiatorUserId: admin.id,
      bidId: bid.id,
      isManual: false,
    })
  );

  const foundBid = await findById(bid.id);

  t.deepEqual(omit(foundBid, "createdAt"), {
    acceptedAt: null,
    bidPriceCents: 2000,
    bidPriceProductionOnlyCents: 0,
    completedAt: null,
    dueDate: bid.dueDate,
    createdBy: admin.id,
    description: "Full Service",
    id: bid.id,
    partnerPayoutLogs: [payout2, payout1],
    partnerUserId: partner.id,
    quoteId: quote.id,
    revenueShareBasisPoints: 0,
  });
});

async function generatePartnerAndBidEvents(
  designerUserId: string,
  partnerUserId: string
): Promise<string> {
  const design = await generateDesign({
    userId: designerUserId,
  });
  const { bid, user: admin } = await generateBid({
    bidOptions: {
      bidPriceCents: 2000,
      assignee: {
        type: "USER",
        id: partnerUserId,
      },
    },
    designId: design.id,
  });
  await generateDesignEvent({
    actorId: partnerUserId,
    bidId: bid.id,
    createdAt: new Date(),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: partnerUserId,
    type: "ACCEPT_SERVICE_BID",
  });
  const payout1 = {
    id: uuid.v4(),
    invoiceId: null,
    payoutAccountId: null,
    payoutAmountCents: 1000,
    message: "Get yo money",
    initiatorUserId: admin.id,
    bidId: bid.id,
    isManual: true,
    createdAt: new Date(2019, 8, 15),
    shortId: null,
  };
  await db.transaction((trx: Knex.Transaction) =>
    PartnerPayoutsDAO.create(trx, payout1)
  );
  return bid.id;
}

test("Bids DAO supports finding bid by id returns the correct partner id", async (t: Test) => {
  await generatePricingValues();
  const { user: designer } = await createUser({ withSession: false });
  const bidPayouts: { bidId: string; partnerId: string }[] = [];
  for (let i = 0; i < 5; i += 1) {
    const { user: partner } = await createUser({
      role: "PARTNER",
      withSession: false,
    });
    const bidId = await generatePartnerAndBidEvents(designer.id, partner.id);
    bidPayouts.push({
      partnerId: partner.id,
      bidId,
    });
  }
  const foundBid1 = await findById(bidPayouts[0].bidId);
  if (foundBid1 === null) {
    t.fail("Bid was not found");
    return;
  }
  t.deepEquals(
    foundBid1.partnerUserId,
    bidPayouts[0].partnerId,
    "Found bid partner id is correct"
  );

  const foundBid2 = await findById(bidPayouts[3].bidId);
  if (foundBid2 === null) {
    t.fail("Bid was not found");
    return;
  }
  t.deepEquals(
    foundBid2.partnerUserId,
    bidPayouts[3].partnerId,
    "Found bid partner id is correct"
  );
});
