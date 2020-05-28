import uuid from "node-uuid";
import { omit } from "lodash";
import { TaskStatus } from "@cala/ts-lib";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import generatePricingValues from "../../test-helpers/factories/pricing-values";
import generatePricingQuote from "../../services/generate-pricing-quote";
import createUser from "../../test-helpers/create-user";
import * as DesignEventsDAO from "../../dao/design-events";
import { create as createDesign } from "../product-designs/dao";

import { BidCreationPayload } from "./domain-object";
import {
  create,
  findAcceptedByTargetId,
  findActiveByTargetId,
  findAll,
  findAllByQuoteAndUserId,
  findById,
  findByQuoteId,
  findCompletedByTargetId,
  findOpenByTargetId,
  findRejectedByTargetId,
  findUnpaidByUserId,
} from "./dao";
import DesignEvent from "../../domain-objects/design-event";
import generateBid from "../../test-helpers/factories/bid";
import generateDesignEvent from "../../test-helpers/factories/design-event";
import { daysToMs } from "../../services/time-conversion";
import * as BidTaskTypesDAO from "../bid-task-types/dao";
import { addDesign } from "../../test-helpers/collections";
import { create as createTaskEvent } from "../../dao/task-events";
import generateCollection from "../../test-helpers/factories/collection";
import PayoutAccountsDAO = require("../../dao/partner-payout-accounts");
import PartnerPayoutsDAO = require("../../components/partner-payouts/dao");
import { PartnerPayoutLog } from "../partner-payouts/domain-object";
import generateTask from "../../test-helpers/factories/task";
import generateProductDesignStage from "../../test-helpers/factories/product-design-stage";
import { taskEventFromIO } from "../../domain-objects/task-event";

const testDate = new Date(2012, 11, 22);

test("Bids DAO supports creation and retrieval", async (t: Test) => {
  sandbox().useFakeTimers(testDate);
  const bidTaskTypesCreateStub = sandbox()
    .stub(BidTaskTypesDAO, "create")
    .resolves({});
  await generatePricingValues();
  const { user } = await createUser();
  const quote = await generatePricingQuote({
    designId: null,
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
    units: 200,
    processTimelinesVersion: 0,
    processesVersion: 0,
    productMaterialsVersion: 0,
    productTypeVersion: 0,
    marginVersion: 0,
    constantsVersion: 0,
    careLabelsVersion: 0,
  });
  const inputBid: BidCreationPayload = {
    acceptedAt: null,
    bidPriceCents: 100000,
    bidPriceProductionOnlyCents: 0,
    createdBy: user.id,
    completedAt: null,
    description: "Full Service",
    dueDate: new Date(quote.createdAt.getTime() + daysToMs(10)),
    id: uuid.v4(),
    quoteId: quote.id,
    taskTypeIds: [],
  };
  const taskTypeIds = ["some-task-type", "another-one"];
  const bid = await create({ ...inputBid, acceptedAt: null, taskTypeIds });
  const retrieved = await findById(inputBid.id);

  t.deepEqual(
    { ...omit(inputBid, ["taskTypeIds"]), createdAt: bid.createdAt },
    bid
  );
  t.deepEqual(bid, omit(retrieved, ["partnerPayoutLogs", "partnerUserId"]));
  t.ok(
    bidTaskTypesCreateStub.calledWith({
      pricingBidId: bid.id,
      taskTypeId: "some-task-type",
    })
  );
  t.ok(
    bidTaskTypesCreateStub.calledWith({
      pricingBidId: bid.id,
      taskTypeId: "another-one",
    })
  );
});

test("Bids DAO findById returns null with a lookup-miss", async (t: Test) => {
  const missed = await findById(uuid.v4());

  t.equal(missed, null);
});

test("Bids DAO supports retrieval by quote ID", async (t: Test) => {
  sandbox().useFakeTimers(testDate);
  await generatePricingValues();
  const { user } = await createUser();
  const quote = await generatePricingQuote({
    designId: null,
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
    units: 200,
    processTimelinesVersion: 0,
    processesVersion: 0,
    productMaterialsVersion: 0,
    productTypeVersion: 0,
    marginVersion: 0,
    constantsVersion: 0,
    careLabelsVersion: 0,
  });
  const inputBid: BidCreationPayload = {
    acceptedAt: null,
    bidPriceCents: 100000,
    bidPriceProductionOnlyCents: 0,
    createdBy: user.id,
    completedAt: null,
    description: "Full Service",
    dueDate: new Date(quote.createdAt.getTime() + daysToMs(10)),
    id: uuid.v4(),
    quoteId: quote.id,
    taskTypeIds: [],
  };
  await create({ ...inputBid, acceptedAt: null, taskTypeIds: [] });
  const bids = await findByQuoteId(quote.id);

  t.deepEqual(
    bids,
    [
      {
        ...omit(inputBid, ["taskTypeIds"]),
        createdAt: bids[0].createdAt,
      },
    ],
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

  const quote = await generatePricingQuote({
    designId: null,
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
    units: 200,
    processTimelinesVersion: 0,
    processesVersion: 0,
    productMaterialsVersion: 0,
    productTypeVersion: 0,
    marginVersion: 0,
    constantsVersion: 0,
    careLabelsVersion: 0,
  });
  const openBid: BidCreationPayload = {
    acceptedAt: null,
    bidPriceCents: 100000,
    bidPriceProductionOnlyCents: 0,
    createdBy: admin.id,
    completedAt: null,
    description: "Full Service",
    dueDate: new Date(quote.createdAt.getTime() + daysToMs(10)),
    id: uuid.v4(),
    quoteId: quote.id,
    taskTypeIds: [],
  };
  const rejectedBid: BidCreationPayload = {
    acceptedAt: null,
    bidPriceCents: 100000,
    bidPriceProductionOnlyCents: 0,
    createdBy: admin.id,
    completedAt: null,
    description: "Full Service (Rejected)",
    dueDate: new Date(quote.createdAt.getTime() + daysToMs(10)),
    id: uuid.v4(),
    quoteId: quote.id,
    taskTypeIds: [],
  };
  const acceptedBid: BidCreationPayload = {
    acceptedAt: null,
    bidPriceCents: 110000,
    bidPriceProductionOnlyCents: 0,
    createdBy: admin.id,
    completedAt: null,
    description: "Full Service (Accepted)",
    dueDate: new Date(quote.createdAt.getTime() + daysToMs(10)),
    id: uuid.v4(),
    quoteId: quote.id,
    taskTypeIds: [],
  };
  const design = await createDesign({
    previewImageUrls: [],
    productType: "A product type",
    title: "A design",
    userId: designer.id,
  });
  const { stage } = await generateProductDesignStage({ designId: design.id });
  const { task } = await generateTask({
    designStageId: stage.id,
    status: TaskStatus.NOT_STARTED,
  });
  const rejectedDesign = await createDesign({
    previewImageUrls: [],
    productType: "A product type",
    title: "A rejected design",
    userId: designer.id,
  });

  const submitEvent: DesignEvent = {
    actorId: designer.id,
    approvalStepId: null,
    approvalSubmissionId: null,
    bidId: null,
    commentId: null,
    createdAt: new Date(2012, 11, 23),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: null,
    taskTypeId: null,
    type: "SUBMIT_DESIGN",
  };

  const bidEvent: DesignEvent = {
    actorId: admin.id,
    approvalStepId: null,
    approvalSubmissionId: null,
    bidId: openBid.id,
    commentId: null,
    createdAt: new Date(2012, 11, 24),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: partner.id,
    taskTypeId: null,
    type: "BID_DESIGN",
  };
  const bidToOtherEvent: DesignEvent = {
    actorId: admin.id,
    approvalStepId: null,
    approvalSubmissionId: null,
    bidId: openBid.id,
    commentId: null,
    createdAt: new Date(2012, 11, 24),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: otherPartner.id,
    taskTypeId: null,
    type: "BID_DESIGN",
  };
  const bidDesignToRejectEvent: DesignEvent = {
    actorId: admin.id,
    approvalStepId: null,
    approvalSubmissionId: null,
    bidId: rejectedBid.id,
    commentId: null,
    createdAt: new Date(2012, 11, 24),
    designId: rejectedDesign.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: partner.id,
    taskTypeId: null,
    type: "BID_DESIGN",
  };
  const bidDesignToAcceptEvent: DesignEvent = {
    actorId: admin.id,
    approvalStepId: null,
    approvalSubmissionId: null,
    bidId: acceptedBid.id,
    commentId: null,
    createdAt: new Date(2012, 11, 24),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: partner.id,
    taskTypeId: null,
    type: "BID_DESIGN",
  };

  const rejectDesignEvent: DesignEvent = {
    actorId: partner.id,
    approvalStepId: null,
    approvalSubmissionId: null,
    bidId: rejectedBid.id,
    commentId: null,
    createdAt: new Date(2012, 11, 25),
    designId: rejectedDesign.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: null,
    taskTypeId: null,
    type: "REJECT_SERVICE_BID",
  };
  const acceptDesignEvent: DesignEvent = {
    actorId: partner.id,
    approvalStepId: null,
    approvalSubmissionId: null,
    bidId: acceptedBid.id,
    commentId: null,
    createdAt: new Date(2012, 11, 27),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: null,
    taskTypeId: null,
    type: "ACCEPT_SERVICE_BID",
  };
  const otherRejectEvent: DesignEvent = {
    actorId: otherPartner.id,
    approvalStepId: null,
    approvalSubmissionId: null,
    bidId: openBid.id,
    commentId: null,
    createdAt: new Date(2012, 11, 23),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: null,
    taskTypeId: null,
    type: "REJECT_SERVICE_BID",
  };

  await create({ ...openBid, acceptedAt: null, taskTypeIds: [] });
  await create({ ...rejectedBid, acceptedAt: null, taskTypeIds: [] });
  await create({ ...acceptedBid, acceptedAt: null, taskTypeIds: [] });
  await DesignEventsDAO.createAll([
    submitEvent,
    bidEvent,
    bidToOtherEvent,
    otherRejectEvent,
    bidDesignToRejectEvent,
    bidDesignToAcceptEvent,
    rejectDesignEvent,
    acceptDesignEvent,
  ]);

  const openBids = await findOpenByTargetId(partner.id, "ACCEPTED");
  const otherBids = await findOpenByTargetId(otherPartner.id, "ACCEPTED");

  t.deepEqual(
    openBids,
    [
      {
        ...omit(openBid, ["taskTypeIds"]),
        createdAt: openBids[0].createdAt,
      },
    ],
    "returns non-rejected/accepted bid"
  );
  t.deepEqual(otherBids, [], "returns no bids");

  const acceptedBids = await findAcceptedByTargetId(partner.id, "ACCEPTED");
  const activeBids = await findActiveByTargetId(partner.id, "ACCEPTED");
  clock.tick(1000);
  await createTaskEvent({
    ...omit(
      taskEventFromIO({ ...task, assignees: [] }, partner.id),
      "createdAt",
      "id"
    ),
    status: TaskStatus.COMPLETED,
  });
  const completedBids = await findCompletedByTargetId(partner.id, "ACCEPTED");
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
  if (completedBids.length === 0) {
    throw new Error("No completed bids found!");
  }

  t.deepEqual(
    acceptedBids,
    [
      {
        ...omit(acceptedBid, ["taskTypeIds"]),
        acceptedAt: acceptedBids[0].acceptedAt,
        createdAt: acceptedBids[0].createdAt,
      },
    ],
    "returns accepted bid"
  );
  t.deepEqual(
    activeBids,
    [
      {
        ...omit(acceptedBid, ["taskTypeIds"]),
        acceptedAt: activeBids[0].acceptedAt,
        createdAt: activeBids[0].createdAt,
      },
    ],
    "returns active bid"
  );
  t.deepEqual(
    completedBids,
    [
      {
        ...omit(acceptedBid, ["taskTypeIds", "completedAt"]),
        acceptedAt: completedBids[0].acceptedAt,
        completedAt: completedBids[0].completedAt,
        createdAt: completedBids[0].createdAt,
      },
    ],
    "returns completed bid"
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
    [
      {
        ...omit(rejectedBid, ["taskTypeIds"]),
        createdAt: rejectedBids[0].createdAt,
      },
    ],
    "returns rejected bid"
  );
  t.deepEqual(
    otherRejectedBids,
    [
      {
        ...omit(openBid, ["taskTypeIds"]),
        createdAt: otherRejectedBids[0].createdAt,
      },
    ],
    "returns rejected bid"
  );
});

test("findOpenByTargetId", async (t: Test) => {
  await generatePricingValues();
  const { user: admin } = await createUser();
  const { user: partner } = await createUser();

  const { bid: b1 } = await generateBid({
    generatePricing: false,
  });
  await generateDesignEvent({
    actorId: admin.id,
    bidId: b1.id,
    targetId: partner.id,
    type: "BID_DESIGN",
  });
  await generateDesignEvent({
    bidId: b1.id,
    targetId: partner.id,
    type: "REMOVE_PARTNER",
  });
  const { bid: b2 } = await generateBid({
    generatePricing: false,
  });
  await generateDesignEvent({
    actorId: admin.id,
    bidId: b2.id,
    targetId: partner.id,
    type: "BID_DESIGN",
  });

  const openBids = await findOpenByTargetId(partner.id, "ACCEPTED");
  t.deepEqual(openBids, [b2], "Returns all open bids for the partner");
});

test("findAcceptedByTargetId", async (t: Test) => {
  sandbox().useFakeTimers(testDate);
  await generatePricingValues();
  const { user: admin } = await createUser();
  const { user: partner } = await createUser();

  const { bid: b1 } = await generateBid({
    bidOptions: {
      dueDate: new Date(testDate.getTime() + daysToMs(1)),
    },
    generatePricing: false,
  });
  await generateDesignEvent({
    actorId: admin.id,
    bidId: b1.id,
    targetId: partner.id,
    type: "BID_DESIGN",
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
      dueDate: new Date(testDate.getTime() + daysToMs(2)),
    },
    generatePricing: false,
  });
  await generateDesignEvent({
    actorId: admin.id,
    bidId: b2.id,
    targetId: partner.id,
    type: "BID_DESIGN",
  });
  const { bid: b3 } = await generateBid({
    bidOptions: {
      dueDate: new Date(testDate.getTime() + daysToMs(3)),
    },
    generatePricing: false,
  });
  await generateDesignEvent({
    actorId: admin.id,
    bidId: b3.id,
    targetId: partner.id,
    type: "BID_DESIGN",
  });
  const { bid: b4 } = await generateBid({
    bidOptions: {
      dueDate: new Date(testDate.getTime() + daysToMs(4)),
    },
    generatePricing: false,
  });
  await generateDesignEvent({
    actorId: admin.id,
    bidId: b4.id,
    targetId: partner.id,
    type: "BID_DESIGN",
  });

  const acceptDate1 = new Date(testDate.getTime() + daysToMs(1));
  sandbox().useFakeTimers(acceptDate1);
  await generateDesignEvent({
    actorId: partner.id,
    bidId: b4.id,
    type: "ACCEPT_SERVICE_BID",
  });
  const acceptDate2 = new Date(testDate.getTime() + daysToMs(2));
  sandbox().useFakeTimers(acceptDate2);
  await generateDesignEvent({
    actorId: partner.id,
    bidId: b2.id,
    type: "ACCEPT_SERVICE_BID",
  });
  const acceptDate3 = new Date(testDate.getTime() + daysToMs(12));
  sandbox().useFakeTimers(acceptDate3);
  await generateDesignEvent({
    actorId: partner.id,
    bidId: b3.id,
    type: "ACCEPT_SERVICE_BID",
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
  const { user: admin } = await createUser();
  const { user: partner } = await createUser();

  const { bid: b1 } = await generateBid({
    generatePricing: false,
  });
  await generateDesignEvent({
    actorId: admin.id,
    bidId: b1.id,
    targetId: partner.id,
    type: "BID_DESIGN",
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
  });
  await generateDesignEvent({
    actorId: admin.id,
    bidId: b2.id,
    targetId: partner.id,
    type: "BID_DESIGN",
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
  const { bid: openBid1 } = await generateBid();
  await generateDesignEvent({
    bidId: openBid1.id,
    type: "BID_DESIGN",
  });
  const fiftyHoursAgo = new Date(now.setHours(now.getHours() - 50));
  sandbox().useFakeTimers(fiftyHoursAgo);
  const { bid: openBid2 } = await generateBid({
    generatePricing: false,
  });
  await generateDesignEvent({
    bidId: openBid2.id,
    type: "BID_DESIGN",
  });

  sandbox().useFakeTimers(now);
  const { bid: acceptedBid } = await generateBid({ generatePricing: false });
  await generateDesignEvent({
    bidId: acceptedBid.id,
    type: "BID_DESIGN",
  });
  await generateDesignEvent({
    bidId: acceptedBid.id,
    type: "ACCEPT_SERVICE_BID",
  });
  sandbox().useFakeTimers(new Date("2019-01-15"));
  const { bid: acceptedBid2 } = await generateBid({
    generatePricing: false,
  });
  await generateDesignEvent({
    bidId: acceptedBid2.id,
    type: "BID_DESIGN",
  });
  sandbox().useFakeTimers(new Date("2019-01-16"));
  await generateDesignEvent({
    bidId: acceptedBid2.id,
    type: "ACCEPT_SERVICE_BID",
  });

  sandbox().useFakeTimers(new Date("2019-01-02"));
  const { bid: expiredBid } = await generateBid({
    generatePricing: false,
  });
  await generateDesignEvent({
    bidId: expiredBid.id,
    type: "BID_DESIGN",
  });

  sandbox().useFakeTimers(new Date("2019-02-05"));
  const { bid: rejectedBid } = await generateBid({
    generatePricing: false,
  });
  await generateDesignEvent({
    bidId: rejectedBid.id,
    type: "BID_DESIGN",
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
  const { user: designer } = await createUser({ withSession: false });
  const { user: partner } = await createUser({
    role: "PARTNER",
    withSession: false,
  });

  const design = await createDesign({
    productType: "TEESHIRT",
    title: "My cool shirt",
    userId: designer.id,
  });
  const { bid: openBid1, quote } = await generateBid({
    designId: design.id,
  });
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
  const { bid: openBid2 } = await generateBid({
    bidOptions: { quoteId: quote.id },
    generatePricing: false,
  });
  const { bid: openBid3 } = await generateBid({
    bidOptions: { quoteId: quote.id },
    generatePricing: false,
    designId: design.id,
  });
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
  await generateBid({ generatePricing: false });

  const acceptDate1 = new Date(testDate.getTime() + daysToMs(1));
  sandbox().useFakeTimers(acceptDate1);
  const { designEvent: de2 } = await generateDesignEvent({
    actorId: partner.id,
    bidId: openBid1.id,
    type: "ACCEPT_SERVICE_BID",
  });

  const acceptDate2 = new Date(testDate.getTime() + daysToMs(3));
  sandbox().useFakeTimers(acceptDate2);
  const { designEvent: de4 } = await generateDesignEvent({
    actorId: partner.id,
    bidId: openBid3.id,
    type: "ACCEPT_SERVICE_BID",
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

  const design = await createDesign({
    productType: "TEESHIRT",
    title: "Plain White Tee",
    userId: designer.id,
  });

  const { collection } = await generateCollection({ createdBy: designer.id });
  await addDesign(collection.id, design.id);
  const { bid, user: admin } = await generateBid({
    bidOptions: { bidPriceCents: 1000 },
    designId: design.id,
  });

  await generateDesignEvent({
    actorId: admin.id,
    bidId: bid.id,
    createdAt: new Date(2019, 9, 1),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: partner.id,
    type: "BID_DESIGN",
  });
  await generateDesignEvent({
    type: "ACCEPT_SERVICE_BID",
    bidId: bid.id,
    actorId: partner.id,
    designId: design.id,
    createdAt: new Date(2019, 9, 1),
  });

  const { user: designer2 } = await createUser();

  const design2 = await createDesign({
    productType: "TEESHIRT",
    title: "Plain White Tee",
    userId: designer2.id,
  });
  const { bid: bid2, user: admin2 } = await generateBid({
    bidOptions: { bidPriceCents: 1000 },
    designId: design2.id,
  });

  await generateDesignEvent({
    actorId: admin2.id,
    bidId: bid2.id,
    createdAt: new Date(),
    designId: design2.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: partner.id,
    type: "BID_DESIGN",
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
  await PartnerPayoutsDAO.create(data);

  const bids = await findUnpaidByUserId(partner.id);
  t.equal(bids.length, 1);
  t.deepEqual(bids, [{ ...bid, acceptedAt: bids[0].acceptedAt }]);
});

test("Bids DAO does not return unpaid bids the partner has been removed from", async (t: Test) => {
  sandbox().useFakeTimers(new Date(2020, 2, 1));
  const { user: designer } = await createUser();
  const { user: partner } = await createUser({ role: "PARTNER" });

  const design = await createDesign({
    productType: "TEESHIRT",
    title: "Plain White Tee",
    userId: designer.id,
  });

  const { collection } = await generateCollection({ createdBy: designer.id });
  await addDesign(collection.id, design.id);
  const { bid, user: admin } = await generateBid({
    bidOptions: { bidPriceCents: 5678 },
    designId: design.id,
  });

  await generateDesignEvent({
    actorId: admin.id,
    bidId: bid.id,
    createdAt: new Date(2020, 1, 1),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: partner.id,
    type: "BID_DESIGN",
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
  const { user: designer } = await createUser({ withSession: false });
  const { user: partner } = await createUser({
    role: "PARTNER",
    withSession: false,
  });

  const design = await createDesign({
    productType: "TEESHIRT",
    title: "My cool shirt",
    userId: designer.id,
  });
  const { bid, user: admin, quote } = await generateBid({
    bidOptions: { bidPriceCents: 2000 },
    designId: design.id,
  });
  await generateDesignEvent({
    actorId: partner.id,
    bidId: bid.id,
    createdAt: new Date(),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: partner.id,
    type: "BID_DESIGN",
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
  await PartnerPayoutsDAO.create(payout1);

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
  const payout2 = {
    id: uuid.v4(),
    invoiceId: null,
    payoutAccountId: payoutAccount.id,
    payoutAmountCents: 1000,
    message: "Get mo money",
    initiatorUserId: admin.id,
    bidId: bid.id,
    isManual: false,
    createdAt: new Date(2019, 8, 15),
    shortId: null,
  };
  await PartnerPayoutsDAO.create(payout2);

  const foundBid = await findById(bid.id);
  if (foundBid) {
    foundBid.partnerPayoutLogs = foundBid.partnerPayoutLogs.map(
      (payoutLog: PartnerPayoutLog) => {
        return { ...payoutLog, shortId: null };
      }
    );
  }

  t.deepEqual(omit(foundBid, "createdAt"), {
    acceptedAt: null,
    bidPriceCents: 2000,
    bidPriceProductionOnlyCents: 0,
    completedAt: null,
    dueDate: bid.dueDate,
    createdBy: admin.id,
    description: "Full Service",
    id: bid.id,
    partnerPayoutLogs: [payout1, payout2],
    partnerUserId: partner.id,
    quoteId: quote.id,
  });
});

async function generatePartnerAndBidEvents(
  designerUserId: string,
  partnerUserId: string
): Promise<string> {
  const design = await createDesign({
    productType: "TEESHIRT",
    title: "My cool shirt",
    userId: designerUserId,
  });
  const { bid, user: admin } = await generateBid({
    bidOptions: { bidPriceCents: 2000 },
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
    type: "BID_DESIGN",
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
  await PartnerPayoutsDAO.create(payout1);
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
