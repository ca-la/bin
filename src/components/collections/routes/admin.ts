import uuid from "node-uuid";
import Knex from "knex";

import db from "../../../services/db";
import DesignsDAO from "../../product-designs/dao";
import * as CollectionsDAO from "../dao";
import DesignEventsDAO from "../../design-events/dao";
import createDesignTasks from "../../../services/create-design-tasks";
import isEveryDesignPaired from "../../../services/is-every-design-paired";
import * as NotificationsService from "../../../services/create-notifications";
import {
  commitCostInputs as commitInputs,
  recostInputs as recost,
} from "../services/cost-inputs";
import * as IrisService from "../../iris/send-message";
import { realtimeCollectionStatusUpdated } from "../realtime";
import { determineSubmissionStatus } from "../services/determine-submission-status";

async function sendCollectionStatusUpdated(
  collectionId: string
): Promise<void> {
  const statusByCollectionId = await determineSubmissionStatus([collectionId]);
  const collectionStatus = statusByCollectionId[collectionId];
  if (!collectionStatus) {
    throw new Error(`Could not get the status for collection ${collectionId}`);
  }

  await IrisService.sendMessage(
    realtimeCollectionStatusUpdated(collectionStatus)
  );
}

async function handleCommitCostInputs(
  collectionId: string,
  userId: string
): Promise<void> {
  await NotificationsService.immediatelySendFullyCostedCollection(
    collectionId,
    userId
  );
  await sendCollectionStatusUpdated(collectionId);
}

export function* commitCostInputs(
  this: AuthedContext
): Iterator<any, any, any> {
  const { collectionId } = this.params;
  const { userId } = this.state;
  yield commitInputs(collectionId, userId);
  yield handleCommitCostInputs(collectionId, userId);
  this.status = 204;
}

export function* recostInputs(this: AuthedContext): Iterator<any, any, any> {
  const { collectionId } = this.params;
  const { userId } = this.state;
  yield recost(collectionId);
  yield commitInputs(collectionId, userId);
  yield handleCommitCostInputs(collectionId, userId);
  this.status = 204;
}

export function* createPartnerPairing(
  this: AuthedContext
): Iterator<any, any, any> {
  const { collectionId } = this.params;
  const { userId } = this.state;
  const collection = yield CollectionsDAO.findById(collectionId);
  if (!collection) {
    this.throw(404, "Could not find collection");
  }

  const designs = yield DesignsDAO.findByCollectionId(collectionId);
  yield db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      const allArePaired = await isEveryDesignPaired(trx, collectionId);

      if (!allArePaired) {
        this.throw(409, "Designs are not all paired");
      }

      for (const design of designs) {
        await DesignEventsDAO.create(trx, {
          actorId: userId,
          approvalStepId: null,
          approvalSubmissionId: null,
          bidId: null,
          commentId: null,
          createdAt: new Date(),
          designId: design.id,
          id: uuid.v4(),
          quoteId: null,
          targetId: null,
          taskTypeId: null,
          type: "COMMIT_PARTNER_PAIRING",
        });
        await createDesignTasks(design.id, "POST_APPROVAL", trx);
      }
    }
  );

  yield NotificationsService.immediatelySendPartnerPairingCommitted({
    actorId: userId,
    collectionId,
    targetUserId: collection.createdBy,
  });

  this.status = 204;
}
