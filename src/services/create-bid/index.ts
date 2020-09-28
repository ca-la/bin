import Knex from "knex";
import uuid from "node-uuid";

import * as BidsDAO from "../../components/bids/dao";
import * as BidTaskTypesDAO from "../../components/bid-task-types/dao";
import * as CollaboratorsDAO from "../../components/collaborators/dao";
import Bid, { BidCreationPayload } from "../../components/bids/domain-object";
import InvalidDataError from "../../errors/invalid-data";
import { findIdByQuoteId } from "../../components/product-designs/dao/dao";
import ResourceNotFoundError from "../../errors/resource-not-found";
import { hasActiveBids } from "../../components/bids/services/has-active-bids";
import { templateDesignEvent } from "../../components/design-events/types";
import { create as createDesignEvent } from "../../components/design-events/dao";
import { MILLISECONDS_TO_EXPIRE } from "../../components/bids/constants";
import * as NotificationsService from "../create-notifications";
import ConflictError from "../../errors/conflict";

interface Assignment {
  bidId: string;
  quoteId: string;
  actorId: string;
  targetId: string;
}

async function assignUser(
  trx: Knex.Transaction,
  { bidId, quoteId, actorId, targetId }: Assignment
) {
  const designId = await findIdByQuoteId(trx, quoteId);

  if (!designId) {
    throw new ResourceNotFoundError(
      `Could not find design for quote with quote ID: ${quoteId}`
    );
  }

  const hasActive = await hasActiveBids(quoteId, targetId);
  if (hasActive) {
    throw new ConflictError(
      `There are active bids for user ${targetId} on the design ${designId}`
    );
  }

  await createDesignEvent(trx, {
    ...templateDesignEvent,
    actorId,
    bidId,
    createdAt: new Date(),
    designId,
    id: uuid.v4(),
    targetId,
    type: "BID_DESIGN",
  });

  const maybeCollaborator = await CollaboratorsDAO.findByDesignAndUser(
    designId,
    targetId
  );
  const now = new Date();
  const cancellationDate = new Date(now.getTime() + MILLISECONDS_TO_EXPIRE);

  if (!maybeCollaborator) {
    await CollaboratorsDAO.create({
      cancelledAt: cancellationDate,
      collectionId: null,
      designId,
      invitationMessage: "",
      role: "PREVIEW",
      userEmail: null,
      userId: targetId,
    });
  } else if (maybeCollaborator.cancelledAt) {
    await CollaboratorsDAO.update(maybeCollaborator.id, {
      cancelledAt: cancellationDate,
    });
  }

  NotificationsService.sendPartnerDesignBid(designId, actorId, targetId);
}

export async function createBid(
  trx: Knex.Transaction,
  bidId: string,
  actorId: string,
  bidCreationRequest: BidCreationPayload
): Promise<Bid> {
  const bid = await BidsDAO.create(trx, {
    bidPriceCents: bidCreationRequest.bidPriceCents,
    bidPriceProductionOnlyCents: bidCreationRequest.bidPriceProductionOnlyCents,
    createdBy: actorId,
    description: bidCreationRequest.description,
    dueDate: new Date(bidCreationRequest.dueDate),
    id: bidId,
    quoteId: bidCreationRequest.quoteId,
    revenueShareBasisPoints: bidCreationRequest.revenueShareBasisPoints,
    createdAt: new Date(),
  });

  const { assignee, taskTypeIds } = bidCreationRequest;

  for (const taskTypeId of taskTypeIds) {
    await BidTaskTypesDAO.create(
      {
        pricingBidId: bidId,
        taskTypeId,
      },
      trx
    );
  }

  switch (assignee.type) {
    case "USER": {
      await assignUser(trx, {
        bidId: bid.id,
        quoteId: bidCreationRequest.quoteId,
        actorId,
        targetId: assignee.id,
      });
      break;
    }

    case "TEAM": {
      /* TODO: Requires `target_team_id` work
        await assignTeam(trx, {
        bidId: created.id,
        quoteId: bidCreationPayload.quoteId,
        actorId: userId,
        targetId: assignee.id,
        });
        break;
        */
    }

    default: {
      throw new InvalidDataError(
        `Attempting to assign a bid with type: ${assignee.type}`
      );
    }
  }

  return bid;
}
