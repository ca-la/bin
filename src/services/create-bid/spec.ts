import uuid from "node-uuid";

import { sandbox, test, Test } from "../../test-helpers/fresh";

import db from "../db";
import * as BidsDAO from "../../components/bids/dao";
import * as BidTaskTypesDAO from "../../components/bid-task-types/dao";
import * as ProductDesignsDAO from "../../components/product-designs/dao/dao";
import * as HasActiveBidsService from "../../components/bids/services/has-active-bids";
import * as DesignEventsDAO from "../../components/design-events/dao";
import * as CollaboratorsDAO from "../../components/collaborators/dao";
import * as NotificationsService from "../create-notifications";

import { createBid } from "./index";
import { BidCreationPayload } from "../../components/bids/types";
import { MILLISECONDS_TO_EXPIRE } from "../../components/bids/constants";

function setup() {
  return {
    bidCreateStub: sandbox().stub(BidsDAO, "create").resolves({
      id: "a-bid-id",
      createdBy: "a-user-id",
    }),
    bidFindStub: sandbox().stub(BidsDAO, "findById").resolves({
      id: "a-bid-id",
      createdBy: "a-user-id",
    }),
    bidTaskTypeCreateStub: sandbox().stub(BidTaskTypesDAO, "create").resolves(),
    findDesignIdByQuoteStub: sandbox()
      .stub(ProductDesignsDAO, "findIdByQuoteId")
      .resolves("a-design-id"),
    hasActiveBidsStub: sandbox()
      .stub(HasActiveBidsService, "hasActiveBids")
      .resolves(false),
    createDesignEventStub: sandbox().stub(DesignEventsDAO, "create").resolves(),
    findUserCollaboratorStub: sandbox()
      .stub(CollaboratorsDAO, "findByDesignAndUser")
      .resolves(null),
    findTeamCollaboratorStub: sandbox()
      .stub(CollaboratorsDAO, "findByDesignAndTeam")
      .resolves(null),
    createCollaboratorStub: sandbox()
      .stub(CollaboratorsDAO, "create")
      .resolves(),
    notificationStub: sandbox()
      .stub(NotificationsService, "sendPartnerDesignBid")
      .resolves(),
    uuidStub: sandbox().stub(uuid, "v4").returns("a-uuid"),
  };
}

test("createBid with user assignee", async (t: Test) => {
  const now = new Date();
  sandbox().useFakeTimers(now);
  const {
    bidCreateStub,
    bidTaskTypeCreateStub,
    createCollaboratorStub,
    createDesignEventStub,
    notificationStub,
  } = setup();

  const trx = await db.transaction();
  const bidCreationPayload: BidCreationPayload = {
    bidPriceCents: 1000,
    bidPriceProductionOnlyCents: 800,
    description: "Full service",
    dueDate: new Date().toISOString(),
    projectDueInMs: 0,
    quoteId: "a-quote-id",
    revenueShareBasisPoints: 200,
    taskTypeIds: ["a-task-type-id", "another-task-type-id"],
    assignee: {
      type: "USER",
      id: "a-partner-user-id",
    },
  };

  try {
    await createBid(trx, "a-bid-id", "a-user-id", bidCreationPayload);
  } finally {
    await trx.rollback();
  }

  t.deepEqual(
    bidCreateStub.args,
    [
      [
        trx,
        {
          bidPriceCents: bidCreationPayload.bidPriceCents,
          bidPriceProductionOnlyCents:
            bidCreationPayload.bidPriceProductionOnlyCents,
          createdBy: "a-user-id",
          description: bidCreationPayload.description,
          dueDate: now,
          id: "a-bid-id",
          quoteId: bidCreationPayload.quoteId,
          revenueShareBasisPoints: bidCreationPayload.revenueShareBasisPoints,
          createdAt: now,
        },
      ],
    ],
    "calls BidsDAO.create with correct arguments"
  );

  t.deepEqual(
    bidTaskTypeCreateStub.args,
    [
      [{ pricingBidId: "a-bid-id", taskTypeId: "a-task-type-id" }, trx],
      [{ pricingBidId: "a-bid-id", taskTypeId: "another-task-type-id" }, trx],
    ],
    "calls BidTaskTypesDAO.create with correct arguments"
  );

  t.deepEqual(
    createDesignEventStub.args,
    [
      [
        trx,
        {
          actorId: "a-user-id",
          bidId: "a-bid-id",
          createdAt: now,
          designId: "a-design-id",
          id: "a-uuid",
          targetId: "a-partner-user-id",
          targetTeamId: null,
          type: "BID_DESIGN",
          quoteId: null,
          approvalStepId: null,
          approvalSubmissionId: null,
          commentId: null,
          taskTypeId: null,
          shipmentTrackingId: null,
          shipmentTrackingEventId: null,
        },
      ],
    ],
    "calls DesignEventsDAO.create with correct arguments"
  );

  t.deepEqual(
    createCollaboratorStub.args,
    [
      [
        {
          cancelledAt: new Date(now.getTime() + MILLISECONDS_TO_EXPIRE),
          collectionId: null,
          designId: "a-design-id",
          invitationMessage: null,
          role: "PREVIEW",
          userEmail: null,
          userId: "a-partner-user-id",
          teamId: null,
        },
        trx,
      ],
    ],
    "calls CollaboratorsDAO.create with correct arguments"
  );

  t.deepEqual(
    notificationStub.args,
    [["a-design-id", "a-user-id", "a-partner-user-id"]],
    "calls Notification service with correct arguments"
  );
});

test("createBid with team assignee", async (t: Test) => {
  const now = new Date();
  sandbox().useFakeTimers(now);
  const {
    bidCreateStub,
    createDesignEventStub,
    bidTaskTypeCreateStub,
    createCollaboratorStub,
  } = setup();

  const trx = await db.transaction();
  const bidCreationPayload: BidCreationPayload = {
    bidPriceCents: 1000,
    bidPriceProductionOnlyCents: 800,
    description: "Full service",
    dueDate: new Date().toISOString(),
    projectDueInMs: 0,
    quoteId: "a-quote-id",
    revenueShareBasisPoints: 200,
    taskTypeIds: ["a-task-type-id", "another-task-type-id"],
    assignee: {
      type: "TEAM",
      id: "a-partner-team-id",
    },
  };

  try {
    await createBid(trx, "a-bid-id", "a-user-id", bidCreationPayload);
  } finally {
    await trx.rollback();
  }

  t.deepEqual(
    bidCreateStub.args,
    [
      [
        trx,
        {
          bidPriceCents: bidCreationPayload.bidPriceCents,
          bidPriceProductionOnlyCents:
            bidCreationPayload.bidPriceProductionOnlyCents,
          createdBy: "a-user-id",
          description: bidCreationPayload.description,
          dueDate: now,
          id: "a-bid-id",
          quoteId: bidCreationPayload.quoteId,
          revenueShareBasisPoints: bidCreationPayload.revenueShareBasisPoints,
          createdAt: now,
        },
      ],
    ],
    "calls BidsDAO.create with correct arguments"
  );

  t.deepEqual(
    bidTaskTypeCreateStub.args,
    [
      [{ pricingBidId: "a-bid-id", taskTypeId: "a-task-type-id" }, trx],
      [{ pricingBidId: "a-bid-id", taskTypeId: "another-task-type-id" }, trx],
    ],
    "calls BidTaskTypesDAO.create with correct arguments"
  );

  t.deepEqual(
    createDesignEventStub.args,
    [
      [
        trx,
        {
          actorId: "a-user-id",
          bidId: "a-bid-id",
          createdAt: now,
          designId: "a-design-id",
          id: "a-uuid",
          targetId: null,
          targetTeamId: "a-partner-team-id",
          type: "BID_DESIGN",
          quoteId: null,
          approvalStepId: null,
          approvalSubmissionId: null,
          commentId: null,
          taskTypeId: null,
          shipmentTrackingId: null,
          shipmentTrackingEventId: null,
        },
      ],
    ],
    "calls DesignEventsDAO.create with correct arguments"
  );

  t.deepEqual(
    createCollaboratorStub.args,
    [
      [
        {
          cancelledAt: new Date(now.getTime() + MILLISECONDS_TO_EXPIRE),
          collectionId: null,
          designId: "a-design-id",
          invitationMessage: null,
          role: "PREVIEW",
          teamId: "a-partner-team-id",
          userEmail: null,
          userId: null,
        },
        trx,
      ],
    ],
    "calls Collaborator.create with correct arguments"
  );
});
