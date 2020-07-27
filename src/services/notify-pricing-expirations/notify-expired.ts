import Knex from "knex";
import uuid from "node-uuid";

import { findAllUnnotifiedCollectionsWithExpiringCostInputs } from "../../components/collections/dao";
import { NotificationType } from "../../components/notifications/domain-object";
import { determineSubmissionStatus } from "../../components/collections/services/determine-submission-status";
import {
  immediatelySendCostingExpiredNotification,
  immediatelySendOneWeekCostingExpirationNotification,
  immediatelySendTwoDayCostingExpirationNotification,
} from "../create-notifications/costing-expirations";
import * as IrisService from "../../components/iris/send-message";
import { MetaCollection } from "../../components/collections/meta-domain-object";
import { realtimeCollectionStatusUpdated } from "../../components/collections/realtime";
import { CALA_OPS_USER_ID } from "../../config";
import ApprovalStep, {
  ApprovalStepType,
} from "../../components/approval-steps/types";
import * as ApprovalStepsDAO from "../../components/approval-steps/dao";
import ProductDesignsDAO from "../../components/product-designs/dao";
import * as DesignEventsDAO from "../../components/design-events/dao";
import { templateDesignEvent } from "../../components/design-events/types";

async function createDesignEvents(
  trx: Knex.Transaction,
  collectionId: string
): Promise<void> {
  const designs = await ProductDesignsDAO.findByCollectionId(collectionId);
  for (const design of designs) {
    const steps = await ApprovalStepsDAO.findByDesign(trx, design.id);
    const checkoutStep = steps.find(
      (step: ApprovalStep) => step.type === ApprovalStepType.CHECKOUT
    );

    if (!checkoutStep) {
      throw new Error("Could not find checkout step for collection submission");
    }
    await DesignEventsDAO.create(trx, {
      ...templateDesignEvent,
      actorId: CALA_OPS_USER_ID,
      approvalStepId: checkoutStep.id,
      createdAt: new Date(),
      designId: design.id,
      id: uuid.v4(),
      type: "COSTING_EXPIRATION",
    });
  }
}

/**
 * Notify the collection owners whose pricing just expired (and have not checked out).
 */
export async function notifyExpired(trx: Knex.Transaction): Promise<number> {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  const expiringCollections = await findAllUnnotifiedCollectionsWithExpiringCostInputs(
    {
      time: oneHourAgo,
      boundingHours: 1,
      notificationType: NotificationType.COSTING_EXPIRED,
      trx,
    }
  );
  const submissionStatuses = await determineSubmissionStatus(
    expiringCollections.map(
      (collection: MetaCollection): string => collection.id
    )
  );
  const collectionsToNotify = expiringCollections.filter(
    (expiringCollection: MetaCollection): boolean => {
      const status = submissionStatuses[expiringCollection.id];
      if (!status.isQuoted) {
        return true;
      }
      return false;
    }
  );

  for (const collectionToNotify of collectionsToNotify) {
    await createDesignEvents(trx, collectionToNotify.id);
    await immediatelySendCostingExpiredNotification({
      collectionId: collectionToNotify.id,
      recipientUserId: collectionToNotify.createdBy,
    });
    await IrisService.sendMessage(
      realtimeCollectionStatusUpdated(submissionStatuses[collectionToNotify.id])
    );
  }

  return collectionsToNotify.length;
}

/**
 * Notify the collection owners whose pricing will expire in two days (and have not checked out).
 */
export async function notifyOneWeekFromExpiring(
  trx: Knex.Transaction
): Promise<number> {
  const oneWeekFromNow = new Date();
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
  const expiringCollections = await findAllUnnotifiedCollectionsWithExpiringCostInputs(
    {
      time: oneWeekFromNow,
      boundingHours: 1,
      notificationType: NotificationType.COSTING_EXPIRATION_ONE_WEEK,
      trx,
    }
  );
  const submissionStatuses = await determineSubmissionStatus(
    expiringCollections.map(
      (collection: MetaCollection): string => collection.id
    )
  );
  const collectionsToNotify = expiringCollections.filter(
    (expiringCollection: MetaCollection): boolean => {
      const status = submissionStatuses[expiringCollection.id];
      if (status.isCosted && !status.isQuoted) {
        return true;
      }
      return false;
    }
  );

  for (const collectionToNotify of collectionsToNotify) {
    await immediatelySendOneWeekCostingExpirationNotification({
      collectionId: collectionToNotify.id,
      recipientUserId: collectionToNotify.createdBy,
    });
  }

  return collectionsToNotify.length;
}

/**
 * Notify the collection owners whose pricing will expire in two days (and have not checked out).
 */
export async function notifyTwoDaysFromExpiring(
  trx: Knex.Transaction
): Promise<number> {
  const twoDaysFromNow = new Date();
  twoDaysFromNow.setHours(twoDaysFromNow.getHours() + 48);
  const expiringCollections = await findAllUnnotifiedCollectionsWithExpiringCostInputs(
    {
      time: twoDaysFromNow,
      boundingHours: 1,
      notificationType: NotificationType.COSTING_EXPIRATION_TWO_DAYS,
      trx,
    }
  );
  const submissionStatuses = await determineSubmissionStatus(
    expiringCollections.map(
      (collection: MetaCollection): string => collection.id
    )
  );
  const collectionsToNotify = expiringCollections.filter(
    (expiringCollection: MetaCollection): boolean => {
      const status = submissionStatuses[expiringCollection.id];
      if (status.isCosted && !status.isQuoted) {
        return true;
      }
      return false;
    }
  );

  for (const collectionToNotify of collectionsToNotify) {
    await immediatelySendTwoDayCostingExpirationNotification({
      collectionId: collectionToNotify.id,
      recipientUserId: collectionToNotify.createdBy,
    });
  }

  return collectionsToNotify.length;
}
