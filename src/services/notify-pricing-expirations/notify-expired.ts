import Knex from 'knex';

import { findAllUnnotifiedCollectionsWithExpiringCostInputs } from '../../components/collections/dao';
import { NotificationType } from '../../components/notifications/domain-object';
import { determineSubmissionStatus } from '../../components/collections/services/determine-submission-status';
import {
  immediatelySendCostingExpiredNotification,
  immediatelySendOneWeekCostingExpirationNotification,
  immediatelySendTwoDayCostingExpirationNotification
} from '../create-notifications/costing-expirations';
import { MetaCollection } from '../../components/collections/meta-domain-object';

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
      trx
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
    await immediatelySendCostingExpiredNotification({
      collectionId: collectionToNotify.id,
      recipientUserId: collectionToNotify.createdBy
    });
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
      trx
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
      recipientUserId: collectionToNotify.createdBy
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
      trx
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
      recipientUserId: collectionToNotify.createdBy
    });
  }

  return collectionsToNotify.length;
}
