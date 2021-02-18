import uuid from "node-uuid";
import { omit } from "lodash";

import DesignEvent, { templateDesignEvent } from "../design-events/types";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import db from "../../services/db";
import { authHeader, del, get, post } from "../../test-helpers/http";
import createUser from "../../test-helpers/create-user";
import generateBid from "../../test-helpers/factories/bid";
import SessionsDAO from "../../dao/sessions";
import * as BidsDAO from "./dao";
import * as UsersDAO from "../users/dao";
import * as BidRejectionDAO from "../bid-rejections/dao";
import * as CollaboratorsDAO from "../collaborators/dao";
import * as DesignEventsDAO from "../design-events/dao";
import TeamsDAO from "../teams/dao";
import ProductDesignsDAO from "../product-designs/dao";
import * as NotificationsService from "../../services/create-notifications";
import * as LockQuoteService from "../../services/create-bid/create-quote-lock";
import * as PayoutAccountsDAO from "../../dao/partner-payout-accounts";
import generateDesignEvent from "../../test-helpers/factories/design-event";
import createDesign from "../../services/create-design";
import * as Stripe from "../../services/stripe";
import EmailService from "../../services/email";
import { deleteById } from "../../test-helpers/designs";
import Knex from "knex";
import { checkout } from "../../test-helpers/checkout-collection";
import PartnerPayoutAccount from "../../domain-objects/partner-payout-account";
import { Bid, BidCreationPayload } from "./types";
import ProductDesign from "../product-designs/domain-objects/product-design";
import { taskTypes } from "../tasks/templates";
import * as CreateBidService from "../../services/create-bid";
import { generateTeam } from "../../test-helpers/factories/team";

const b1: Partial<Bid> = {
  id: "a-bid-id",
  quoteId: "a-quote-id",
};

const d1: Partial<ProductDesign> = {
  id: "a-design-id",
};

const b1d1 = {
  ...b1,
  design: d1,
};

function setup(role: string = "PARTNER") {
  return {
    sessionStub: sandbox().stub(SessionsDAO, "findById").resolves({
      role,
      userId: "a-user-id",
    }),
    findDesignByQuoteStub: sandbox()
      .stub(ProductDesignsDAO, "findByQuoteId")
      .resolves(d1),
    createStub: sandbox().stub(CreateBidService, "createBid").resolves(b1),
    findUnpaidBidsByUserStub: sandbox()
      .stub(BidsDAO, "findUnpaidByUserId")
      .resolves([b1d1]),
    findUnpaidBidsByTeamStub: sandbox()
      .stub(BidsDAO, "findUnpaidByTeamId")
      .resolves([b1d1]),
    lockQuoteStub: sandbox().stub(LockQuoteService, "default").resolves(),
  };
}

test("GET /bids?limit&offset as an admin fetching everything", async (t: Test) => {
  setup("ADMIN");
  const findAllStub = sandbox().stub(BidsDAO, "findAll").resolves([b1]);

  const [response, bids] = await get("/bids?limit=100&offset=50", {
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 200, "Successfully returns");
  t.deepEqual(bids, [b1], "Successfully returns the stub list");
  t.equal(findAllStub.callCount, 1, "Calls the findAll method exactly once");
  t.equal(findAllStub.args[0][0], db, "Passing db to the BidsDAO.findAll()");

  const [badResponse, badBody] = await get("/bids", {
    headers: authHeader("a-session-id"),
  });

  t.equal(badResponse.status, 400, "Fails when a limit/offset is not passed");
  t.equal(
    badBody.message,
    "Must specify a limit and offset when fetching all bids!"
  );
});

test("GET /bids?userId", async (t: Test) => {
  setup();
  const findOpenStub = sandbox()
    .stub(BidsDAO, "findOpenByTargetId")
    .resolves([b1]);

  const [response, bids] = await get(`/bids?userId=a-user-id`, {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 200);
  t.deepEqual(bids, [b1d1], "returns only bids assigned to requested user");

  t.deepEqual(
    findOpenStub.args[0],
    [db, "a-user-id", "ACCEPTED"],
    "calls DAO function with correct arguments"
  );
});

test("GET /bids?userId&state=OPEN", async (t: Test) => {
  setup();
  const findOpenStub = sandbox()
    .stub(BidsDAO, "findOpenByTargetId")
    .resolves([b1]);

  const [response, bids] = await get("/bids?userId=a-user-id&state=OPEN", {
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 200);
  t.deepEqual(bids, [b1d1], "returns only bids assigned to requested user");
  t.deepEqual(
    findOpenStub.args[0].slice(1),
    ["a-user-id", "ACCEPTED"],
    "calls DAO function with correct arguments"
  );
});

test("GET /bids?userId&state=EXPIRED", async (t: Test) => {
  const testDate = new Date(2012, 11, 23);
  sandbox().useFakeTimers(testDate);
  setup();
  const findOpenStub = sandbox()
    .stub(BidsDAO, "findOpenByTargetId")
    .resolves([
      { id: "a-bid-id", createdAt: new Date(2012, 11, 22) },
      { id: "an-expired-bid-id", createdAt: new Date(2012, 11, 19) },
    ]);

  const [response, bids] = await get("/bids?userId=a-user-id&state=EXPIRED", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 200);
  t.deepEqual(
    bids,
    [
      {
        id: "an-expired-bid-id",
        createdAt: new Date(2012, 11, 19).toISOString(),
        design: d1,
      },
    ],
    "returns only expired bid assigned to the user"
  );

  t.deepEqual(
    findOpenStub.args[0].slice(1),
    ["a-user-id", "ACCEPTED"],
    "calls DAO function with correct arguments"
  );
});

test("GET /bids?userId&state=REJECTED", async (t: Test) => {
  setup();
  const findRejectedStub = sandbox()
    .stub(BidsDAO, "findRejectedByTargetId")
    .resolves([b1]);

  const [response, bids] = await get(`/bids?userId=a-user-id&state=REJECTED`, {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 200);
  t.deepEqual(bids, [b1d1], "returns rejected bids");
  t.deepEqual(
    findRejectedStub.args[0].slice(1),
    ["a-user-id", "ACCEPTED"],
    "calls DAO function with correct arguments"
  );
});

test("GET /bids?userId&state=ACCEPTED", async (t: Test) => {
  setup();
  const findAcceptedStub = sandbox()
    .stub(BidsDAO, "findAcceptedByTargetId")
    .resolves([b1]);

  const [response, bids] = await get("/bids?userId=a-user-id&state=ACCEPTED", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 200);
  t.deepEqual(bids, [b1d1], "returns accepted bids");
  t.deepEqual(
    findAcceptedStub.args[0].slice(1),
    ["a-user-id", "ACCEPTED"],
    "calls DAO function with correct arguments"
  );
});

test("GET /bids/:bidId/assignees", async (t: Test) => {
  const { sessionStub } = setup();

  sandbox()
    .stub(UsersDAO, "findByBidId")
    .resolves([{ id: "a-user-id" }]);

  const [unauthorized] = await get("/bids/a-bid-id/assignees", {
    headers: authHeader("a-session-id"),
  });

  t.equal(unauthorized.status, 403, "requires admin role");

  sessionStub.resolves({ role: "ADMIN" });
  const [response, assignees] = await get(`/bids/a-bid-id/assignees`, {
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 200);
  t.deepEqual(assignees, [
    {
      id: "a-user-id",
    },
  ]);
});

test("DELETE /bids/:bidId/assignees/:partnerId with user assignee", async (t: Test) => {
  const testDate = new Date(2012, 11, 22);
  sandbox().useFakeTimers(testDate);
  sandbox().stub(uuid, "v4").returns("a-uuid");
  sandbox().stub(ProductDesignsDAO, "findByQuoteId").resolves({
    id: "a-design-id",
  });
  sandbox().stub(BidsDAO, "findById").resolves({
    id: "a-bid-id",
  });
  sandbox().stub(UsersDAO, "findById").resolves({
    id: "a-user-id",
  });
  sandbox().stub(CollaboratorsDAO, "cancelForDesignAndPartner").resolves();

  const eventCreateStub = sandbox().stub(DesignEventsDAO, "create").resolves();

  sandbox().stub(SessionsDAO, "findById").resolves({
    role: "ADMIN",
    userId: "an-admin-id",
  });

  const [response] = await del(`/bids/a-bid-id/assignees/a-user-id`, {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 204);

  t.deepEqual(eventCreateStub.args[0][1], {
    ...templateDesignEvent,
    actorId: "an-admin-id",
    bidId: "a-bid-id",
    createdAt: testDate,
    designId: "a-design-id",
    id: "a-uuid",
    targetId: "a-user-id",
    targetTeamId: null,
    type: "REMOVE_PARTNER",
  });
});

test("DELETE /bids/:bidId/assignees/:partnerId with team assignee", async (t: Test) => {
  const testDate = new Date(2012, 11, 22);
  sandbox().useFakeTimers(testDate);
  sandbox().stub(uuid, "v4").returns("a-uuid");
  sandbox().stub(ProductDesignsDAO, "findByQuoteId").resolves({
    id: "a-design-id",
  });
  sandbox().stub(BidsDAO, "findById").resolves({
    id: "a-bid-id",
  });
  sandbox().stub(UsersDAO, "findById").resolves(null);
  sandbox().stub(TeamsDAO, "findById").resolves({
    id: "a-team-id",
  });
  sandbox().stub(CollaboratorsDAO, "cancelForDesignAndPartner").resolves();

  const eventCreateStub = sandbox().stub(DesignEventsDAO, "create").resolves();

  sandbox().stub(SessionsDAO, "findById").resolves({
    role: "ADMIN",
    userId: "an-admin-id",
  });

  const [response] = await del(`/bids/a-bid-id/assignees/a-user-id`, {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 204);

  t.deepEqual(eventCreateStub.args[0][1], {
    ...templateDesignEvent,
    actorId: "an-admin-id",
    bidId: "a-bid-id",
    createdAt: testDate,
    designId: "a-design-id",
    id: "a-uuid",
    targetId: null,
    targetTeamId: "a-team-id",
    type: "REMOVE_PARTNER",
  });
});

test("Partner pairing: accept as user", async (t: Test) => {
  const {
    user: { admin },
    collectionDesigns: [design],
    quotes: [quote],
  } = await checkout();
  const partner = await createUser({ role: "PARTNER" });
  const other = await createUser({ role: "USER" });
  const { bid } = await generateBid({
    quoteId: quote.id,
    userId: admin.user.id,
    designId: design.id,
    bidOptions: { assignee: { type: "USER", id: partner.user.id } },
    generatePricing: false,
    taskTypeIds: [taskTypes.TECHNICAL_DESIGN.id, taskTypes.PRODUCTION.id],
  });

  const notificationStub = sandbox()
    .stub(NotificationsService, "sendPartnerAcceptServiceBidNotification")
    .resolves();

  const [missingBidResponse] = await post(`/bids/${uuid.v4()}/accept`, {
    headers: authHeader(partner.session.id),
  });
  t.equal(missingBidResponse.status, 404, "Unknown bid returns 404");

  const [unauthorizedBidResponse] = await post(`/bids/${bid.id}/accept`, {
    headers: authHeader(other.session.id),
  });
  t.equal(
    unauthorizedBidResponse.status,
    403,
    "Non-collaborator cannot accept bid"
  );

  const [response, body] = await post(`/bids/${bid.id}/accept`, {
    headers: authHeader(partner.session.id),
  });

  const designEvents = await db.transaction((trx: Knex.Transaction) =>
    DesignEventsDAO.find(trx, { designId: design.id })
  );

  t.equal(
    response.status,
    200,
    "returns a 200 when successfully accepting a bid."
  );
  t.deepEqual(
    body,
    {
      ...bid,
      createdAt: bid.createdAt.toISOString(),
      design: {
        ...design,
        createdAt: design.createdAt.toISOString(),
      },
      dueDate: bid.dueDate!.toISOString(),
      assignee: {
        type: "USER",
        id: partner.user.id,
        name: partner.user.name,
      },
    },
    "responds with the accepted bid and associated design."
  );
  t.deepEqual(
    designEvents.map((event: DesignEvent): any => ({
      actorId: event.actorId,
      designId: event.designId,
      type: event.type,
    })),
    [
      {
        actorId: admin.user.id,
        designId: design.id,
        type: "BID_DESIGN",
      },
      {
        actorId: partner.user.id,
        designId: design.id,
        type: "ACCEPT_SERVICE_BID",
      },
      {
        actorId: partner.user.id,
        designId: design.id,
        type: "STEP_PARTNER_PAIRING",
      },
      {
        actorId: partner.user.id,
        designId: design.id,
        type: "STEP_PARTNER_PAIRING",
      },
    ],
    "Adds an acceptance event"
  );

  const designCollaborator = await CollaboratorsDAO.findByDesignAndUser(
    design.id,
    partner.user.id
  );

  t.equal(
    designCollaborator!.userId,
    partner.user.id,
    "The partner is a design collaborator"
  );
  t.equal(
    designCollaborator!.role,
    "PARTNER",
    "The partner has the PARTNER role"
  );

  t.equal(notificationStub.callCount, 1);

  const [duplicateAcceptanceResponse, duplicateAcceptanceBody] = await post(
    `/bids/${bid.id}/accept`,
    {
      headers: authHeader(partner.session.id),
    }
  );

  t.equal(duplicateAcceptanceResponse.status, 400);
  t.equal(
    duplicateAcceptanceBody.message,
    "This bid has already been accepted or rejected"
  );
});

test("Partner pairing: accept as a team member", async (t: Test) => {
  const {
    user: { admin },
    collectionDesigns: [design],
    quotes: [quote],
  } = await checkout();
  const partner = await createUser({ role: "PARTNER" });
  const { team } = await generateTeam(partner.user.id);
  const { bid } = await generateBid({
    quoteId: quote.id,
    userId: admin.user.id,
    designId: design.id,
    bidOptions: { assignee: { type: "TEAM", id: team.id } },
    generatePricing: false,
    taskTypeIds: [taskTypes.TECHNICAL_DESIGN.id, taskTypes.PRODUCTION.id],
  });

  sandbox()
    .stub(NotificationsService, "sendPartnerAcceptServiceBidNotification")
    .resolves();

  const [response, body] = await post(`/bids/${bid.id}/accept`, {
    headers: authHeader(partner.session.id),
  });

  const designEvents = await db.transaction((trx: Knex.Transaction) =>
    DesignEventsDAO.find(trx, { designId: design.id })
  );

  t.equal(
    response.status,
    200,
    "returns a 200 when successfully accepting a bid."
  );
  t.deepEqual(
    body,
    {
      ...bid,
      createdAt: bid.createdAt.toISOString(),
      design: {
        ...design,
        createdAt: design.createdAt.toISOString(),
      },
      dueDate: bid.dueDate!.toISOString(),
      assignee: {
        type: "TEAM",
        id: team.id,
        name: team.title,
      },
    },
    "responds with the accepted bid and associated design."
  );
  t.deepEqual(
    designEvents.map((event: DesignEvent): any => ({
      actorId: event.actorId,
      designId: event.designId,
      type: event.type,
      targetTeamId: event.targetTeamId,
    })),
    [
      {
        actorId: admin.user.id,
        designId: design.id,
        type: "BID_DESIGN",
        targetTeamId: team.id,
      },
      {
        actorId: partner.user.id,
        designId: design.id,
        type: "ACCEPT_SERVICE_BID",
        targetTeamId: team.id,
      },
      {
        actorId: partner.user.id,
        designId: design.id,
        type: "STEP_PARTNER_PAIRING",
        targetTeamId: team.id,
      },
      {
        actorId: partner.user.id,
        designId: design.id,
        type: "STEP_PARTNER_PAIRING",
        targetTeamId: team.id,
      },
    ],
    "Adds an acceptance event"
  );
});

test("Partner pairing: accept on a deleted design", async (t: Test) => {
  const {
    user: { admin },
    collectionDesigns: [design],
  } = await checkout();
  const partner = await createUser({ role: "PARTNER" });
  const { bid } = await generateBid({
    designId: design.id,
    generatePricing: true,
    userId: admin.user.id,
    bidOptions: {
      assignee: {
        type: "USER",
        id: partner.user.id,
      },
    },
  });

  await deleteById(design.id);

  const [noDesignResponse] = await post(`/bids/${bid.id}/accept`, {
    headers: authHeader(partner.session.id),
  });

  t.equal(noDesignResponse.status, 400, "Expect the bid assignment to fail.");
});

test("Partner pairing: reject as user", async (t: Test) => {
  const {
    user: { admin },
    collectionDesigns: [design],
    quotes: [quote],
  } = await checkout();
  const other = await createUser({ role: "PARTNER" });
  const partner = await createUser({ role: "PARTNER" });
  const { bid } = await generateBid({
    quoteId: quote.id,
    userId: admin.user.id,
    designId: design.id,
    bidOptions: {
      assignee: {
        type: "USER",
        id: partner.user.id,
      },
    },
    generatePricing: false,
  });
  const bidRejection = {
    createdBy: admin.user.id,
    priceTooLow: false,
    deadlineTooShort: false,
    missingInformation: false,
    other: true,
    notes: "Unable to complete as designed",
  };
  const notificationStub = sandbox()
    .stub(NotificationsService, "sendPartnerRejectServiceBidNotification")
    .resolves();

  const [missingBidResponse] = await post(`/bids/${uuid.v4()}/reject`, {
    headers: authHeader(partner.session.id),
    body: bidRejection,
  });
  t.equal(missingBidResponse.status, 404, "Unknown bid returns 404");

  const [unauthorizedBidResponse] = await post(`/bids/${bid.id}/reject`, {
    headers: authHeader(other.session.id),
    body: bidRejection,
  });
  t.equal(
    unauthorizedBidResponse.status,
    403,
    "Non-collaborator cannot reject bid"
  );

  const [response] = await post(`/bids/${bid.id}/reject`, {
    headers: authHeader(partner.session.id),
    body: bidRejection,
  });

  const designEvents = await db.transaction((trx: Knex.Transaction) =>
    DesignEventsDAO.find(trx, { designId: design.id })
  );
  const createdRejection = await BidRejectionDAO.findByBidId(bid.id);

  t.equal(response.status, 204);
  t.deepEqual(
    designEvents.map((event: DesignEvent): any => ({
      actorId: event.actorId,
      designId: event.designId,
      type: event.type,
    })),
    [
      {
        actorId: admin.user.id,
        designId: design.id,
        type: "BID_DESIGN",
      },
      {
        actorId: partner.user.id,
        designId: design.id,
        type: "REJECT_SERVICE_BID",
      },
    ],
    "Adds a rejection event"
  );
  t.deepEqual(omit(createdRejection, "id", "createdAt", "bidId"), bidRejection);

  const designCollaborator = await CollaboratorsDAO.findByDesignAndUser(
    design.id,
    partner.user.id
  );

  t.equal(designCollaborator, null, "The partner is no longer a collaborator");

  t.deepEqual(
    notificationStub.args,
    [
      [
        {
          actorId: partner.user.id,
          designId: design.id,
          bidRejection: createdRejection,
        },
      ],
    ],
    "calls notification service with correct arguments"
  );

  const [duplicateRejectionResponse, duplicateRejectionBody] = await post(
    `/bids/${bid.id}/reject`,
    {
      headers: authHeader(partner.session.id),
      body: bidRejection,
    }
  );

  t.equal(duplicateRejectionResponse.status, 403);
  t.equal(
    duplicateRejectionBody.message,
    "You may only reject a bid you have been assigned to"
  );
});

test("Partner pairing: reject as team member", async (t: Test) => {
  const {
    user: { admin },
    collectionDesigns: [design],
    quotes: [quote],
  } = await checkout();
  const partner = await createUser({ role: "PARTNER" });
  const { team } = await generateTeam(partner.user.id);
  const { bid } = await generateBid({
    quoteId: quote.id,
    userId: admin.user.id,
    designId: design.id,
    bidOptions: {
      assignee: {
        type: "TEAM",
        id: team.id,
      },
    },
    generatePricing: false,
  });
  const bidRejection = {
    createdBy: admin.user.id,
    priceTooLow: false,
    deadlineTooShort: false,
    missingInformation: false,
    other: true,
    notes: "Unable to complete as designed",
  };
  sandbox()
    .stub(NotificationsService, "sendPartnerRejectServiceBidNotification")
    .resolves();

  const [response] = await post(`/bids/${bid.id}/reject`, {
    headers: authHeader(partner.session.id),
    body: bidRejection,
  });

  const designEvents = await db.transaction((trx: Knex.Transaction) =>
    DesignEventsDAO.find(trx, { designId: design.id })
  );
  const createdRejection = await BidRejectionDAO.findByBidId(bid.id);

  t.equal(response.status, 204);
  t.deepEqual(
    designEvents.map((event: DesignEvent): any => ({
      actorId: event.actorId,
      designId: event.designId,
      type: event.type,
      targetTeamId: event.targetTeamId,
    })),
    [
      {
        actorId: admin.user.id,
        designId: design.id,
        type: "BID_DESIGN",
        targetTeamId: team.id,
      },
      {
        actorId: partner.user.id,
        designId: design.id,
        type: "REJECT_SERVICE_BID",
        targetTeamId: team.id,
      },
    ],
    "Adds a rejection event"
  );
  t.deepEqual(omit(createdRejection, "id", "createdAt", "bidId"), bidRejection);

  const designCollaborator = await CollaboratorsDAO.findByDesignAndUser(
    design.id,
    partner.user.id
  );

  t.equal(designCollaborator, null, "The partner is no longer a collaborator");
});

test("GET /bids/:bidId gets a bid by an id for admins", async (t: Test) => {
  const admin = await createUser({ role: "ADMIN" });
  const getByIdStub = sandbox().stub(BidsDAO, "findById").resolves({});
  sandbox().stub(BidsDAO, "findByBidIdAndUser").resolves(null);
  await get(`/bids/a-real-bid-id`, {
    headers: authHeader(admin.session.id),
  });
  t.equal(getByIdStub.callCount, 1);
  t.deepEqual(getByIdStub.args[0][1], "a-real-bid-id");

  const partner = await createUser({ role: "PARTNER" });
  const [failedResponsePartner] = await get(`/bids/a-real-bid-id`, {
    headers: authHeader(partner.session.id),
  });
  t.equal(failedResponsePartner.status, 404, "Only admins have full access");

  const user = await createUser({ role: "USER" });
  const [failedResponseUser] = await get(`/bids/a-real-bid-id`, {
    headers: authHeader(user.session.id),
  });
  t.equal(failedResponseUser.status, 404, "Only admins have full access");
});

test("GET /bids/:bidId gets a bid by an id for admins", async (t: Test) => {
  const admin = await createUser({ role: "ADMIN" });
  const getByIdStub = sandbox().stub(BidsDAO, "findById").resolves({});
  sandbox().stub(BidsDAO, "findByBidIdAndUser").resolves(null);
  await get(`/bids/a-real-bid-id`, {
    headers: authHeader(admin.session.id),
  });
  t.equal(getByIdStub.callCount, 1);
  t.deepEqual(getByIdStub.args[0][1], "a-real-bid-id");

  const partner = await createUser({ role: "PARTNER" });
  const [failedResponsePartner] = await get(`/bids/a-real-bid-id`, {
    headers: authHeader(partner.session.id),
  });
  t.equal(failedResponsePartner.status, 404, "Only admins have full access");

  const user = await createUser({ role: "USER" });
  const [failedResponseUser] = await get(`/bids/a-real-bid-id`, {
    headers: authHeader(user.session.id),
  });
  t.equal(failedResponseUser.status, 404, "Only admins have full access");
});

test("GET /bids/:bidId gets a bid by an id for the partner assigned", async (t: Test) => {
  const { user: partner, session } = await createUser({ role: "PARTNER" });
  const getBidStub = sandbox()
    .stub(BidsDAO, "findByBidIdAndUser")
    .resolves({
      id: "a-real-bid-id",
      acceptedAt: new Date(),
      createdAt: new Date(),
      createdBy: "a-real-ops-user",
      dueDate: new Date(),
      quoteId: "quote-id",
      bidPriceCents: 1000,
      bidPriceProductionOnlyCents: 0,
      description: "",
      partnerUserId: partner.id,
      assignee: {
        type: "USER",
        id: partner.id,
        name: partner.name,
      },
    });

  const [response] = await get(`/bids/a-real-bid-id`, {
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200, "Returns bid to the assigned partner");
  t.equal(getBidStub.callCount, 1);
  t.deepEqual(getBidStub.args[0].slice(1), ["a-real-bid-id", partner.id]);
});

test("POST /bids/:bidId/pay-out-to-partner", async (t: Test) => {
  const sendTransferStub = sandbox().stub(Stripe, "sendTransfer");
  const enqueueSendStub = sandbox().stub(EmailService, "enqueueSend");
  const { user } = await createUser({ withSession: false });
  const admin = await createUser({
    role: "ADMIN",
  });
  const { user: partner } = await createUser({
    role: "PARTNER",
    withSession: false,
  });

  const payoutAccount: PartnerPayoutAccount = await PayoutAccountsDAO.create({
    id: uuid.v4(),
    createdAt: new Date(),
    deletedAt: null,
    userId: user.id,
    stripeAccessToken: "stripe-access-one",
    stripeRefreshToken: "stripe-refresh-one",
    stripePublishableKey: "stripe-publish-one",
    stripeUserId: "stripe-user-one",
  });

  const design = await createDesign({
    productType: "TEESHIRT",
    title: "Plain White Tee",
    userId: user.id,
  });

  const { bid } = await generateBid({
    bidOptions: { bidPriceCents: 1000 },
    designId: design.id,
  });

  await generateDesignEvent({
    actorId: admin.user.id,
    bidId: bid.id,
    createdAt: new Date(),
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
  });
  const [missingpayoutAccount] = await post(
    `/bids/${bid.id}/pay-out-to-partner`,
    {
      headers: authHeader(admin.session.id),
      body: {
        message: "Money 4 u",
        bidId: bid.id,
        isManual: false,
        payoutAmountCents: 100,
      },
    }
  );
  t.equal(missingpayoutAccount.status, 400, "Expect payout to fail.");

  const [missingMessage] = await post(`/bids/${bid.id}/pay-out-to-partner`, {
    headers: authHeader(admin.session.id),
    body: {
      payoutAccountId: payoutAccount.id,
      bidId: bid.id,
      message: "",
      isManual: false,
      payoutAmountCents: 100,
    },
  });
  t.equal(missingMessage.status, 400, "Expect payout to fail.");

  const [successfulPayout] = await post(`/bids/${bid.id}/pay-out-to-partner`, {
    headers: authHeader(admin.session.id),
    body: {
      stripeSourceType: "financing",
      payoutAccountId: payoutAccount.id,
      message: "Money 4 u",
      bidId: bid.id,
      isManual: false,
      payoutAmountCents: 100,
    },
  });
  t.equal(successfulPayout.status, 204, "Payout succeeds");
  t.equal(sendTransferStub.callCount, 1);
  t.equal(sendTransferStub.firstCall.args[0].sourceType, "financing");
  t.equal(enqueueSendStub.callCount, 1);

  enqueueSendStub.reset();
  sendTransferStub.reset();

  const [manualPayout] = await post(`/bids/${bid.id}/pay-out-to-partner`, {
    headers: authHeader(admin.session.id),
    body: {
      payoutAccountId: null,
      message: "Money 4 u",
      bidId: bid.id,
      isManual: true,
      payoutAmountCents: 100,
    },
  });
  t.equal(manualPayout.status, 204, "Manual payout succeeds");

  // Callcount should not have changed
  t.equal(sendTransferStub.callCount, 0);
  t.equal(enqueueSendStub.callCount, 0);
});

test("POST /bids", async (t: Test) => {
  const { sessionStub } = setup("ADMIN");
  const bidCreationPayload: BidCreationPayload = {
    quoteId: "a-quote-id",
    description: "a description",
    bidPriceCents: 1000,
    bidPriceProductionOnlyCents: 0,
    dueDate: new Date().toISOString(),
    projectDueInMs: 0,
    taskTypeIds: [],
    revenueShareBasisPoints: 200,
    assignee: {
      type: "USER",
      id: "a-user-id",
    },
  };

  const [response, body] = await post("/bids", {
    headers: authHeader("a-session-id"),
    body: bidCreationPayload,
  });

  t.equal(response.status, 201, "returns a Created status");
  t.deepEqual(body, b1, "returns the created bid");

  sessionStub.resolves({ role: "USER", userId: "a-user-id" });
  const [unauthorized] = await post("/bids", {
    headers: authHeader("a-session-id"),
    body: bidCreationPayload,
  });

  t.equal(
    unauthorized.status,
    403,
    "returns an Unauthorized status for non-admins"
  );
});

test("POST /bids blocks concurrent bid creation", async (t: Test) => {
  const {
    quotes: [quote],
  } = await checkout();
  const admin = await createUser({ role: "ADMIN" });
  const partner = await createUser({ role: "PARTNER", withSession: false });
  const bidCreationPayload: BidCreationPayload = {
    quoteId: quote.id,
    description: "a description",
    bidPriceCents: 1000,
    bidPriceProductionOnlyCents: 0,
    dueDate: new Date().toISOString(),
    projectDueInMs: 0,
    taskTypeIds: [],
    revenueShareBasisPoints: 200,
    assignee: {
      type: "USER",
      id: partner.user.id,
    },
  };

  const [[r0], [r1], [r2]] = await Promise.all([
    post("/bids", {
      headers: authHeader(admin.session.id),
      body: bidCreationPayload,
    }),
    post("/bids", {
      headers: authHeader(admin.session.id),
      body: bidCreationPayload,
    }),
    post("/bids", {
      headers: authHeader(admin.session.id),
      body: bidCreationPayload,
    }),
  ]);

  t.deepEqual(
    [r0.status, r1.status, r2.status].sort(),
    [201, 409, 409],
    "Only one request succeeds"
  );
});

test("GET /unpaid?userId=", async (t: Test) => {
  const { sessionStub, findUnpaidBidsByUserStub } = setup("ADMIN");

  const [response, body] = await get("/bids/unpaid?userId=a-user-id", {
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 200, "returns a success status");
  t.deepEqual(body, [b1d1], "returns bids");
  t.deepEqual(
    findUnpaidBidsByUserStub.args,
    [[db, "a-user-id"]],
    "passes db to the DAO function"
  );

  sessionStub.resolves({ role: "USER", userId: "a-user-id" });
  const [unauthorized] = await get("/bids/unpaid?userId=a-user-id", {
    headers: authHeader("a-session-id"),
  });

  t.equal(
    unauthorized.status,
    403,
    "returns an Unauthorized status for non-admins"
  );
});

test("GET /unpaid?teamId=", async (t: Test) => {
  const { findUnpaidBidsByTeamStub } = setup("ADMIN");

  const [response, body] = await get("/bids/unpaid?teamId=a-team-id", {
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 200, "returns a success status");
  t.deepEqual(body, [b1d1], "returns bids");
  t.deepEqual(
    findUnpaidBidsByTeamStub.args,
    [[db, "a-team-id"]],
    "passes db to the DAO function"
  );
});

test("GET /unpaid with missing query", async (t: Test) => {
  setup("ADMIN");

  const [response] = await get("/bids/unpaid", {
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 400, "Requires userId or teamId");
});
