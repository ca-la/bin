import * as Knex from 'knex';
import { omit } from 'lodash';

import * as db from '../../services/db';
import first from '../../services/first';
import {
  dataAdapter,
  isNotificationRow,
  Notification,
  NotificationRow
} from './domain-object';
import * as CollaboratorsDAO from '../../components/collaborators/dao';
import Collaborator from '../../components/collaborators/domain-objects/collaborator';
import { validate, validateEvery } from '../../services/validate-from-db';

interface SearchInterface {
  limit: number;
  offset: number;
}

const TABLE_NAME = 'notifications';

/**
 * Returns all outstanding notifications (e.g. not sent) with associated objects attached.
 */
export async function findOutstanding(trx?: Knex.Transaction): Promise<Notification[]> {
  const outstandingNotifications: NotificationRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ sent_email_at: null })
    .whereNot({ recipient_user_id: null })
    .orderBy('created_at', 'desc')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  return validateEvery<NotificationRow, Notification>(
    TABLE_NAME,
    isNotificationRow,
    dataAdapter,
    outstandingNotifications
  );
}

export async function markSent(ids: string[], trx?: Knex.Transaction): Promise<Notification[]> {
  const updatedNotifications: NotificationRow[] = await db(TABLE_NAME)
    .whereIn('id', ids)
    .update({ sent_email_at: (new Date()).toISOString() }, '*')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  return validateEvery<NotificationRow, Notification>(
    TABLE_NAME,
    isNotificationRow,
    dataAdapter,
    updatedNotifications
  );
}

export async function create(data: Uninserted<Notification>): Promise<Notification> {
  const rowData = dataAdapter.forInsertion(data);
  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .then((rows: NotificationRow[]) => first<NotificationRow>(rows));

  if (!created) { throw new Error('Failed to create a notification!'); }

  return validate<NotificationRow, Notification>(
    TABLE_NAME,
    isNotificationRow,
    dataAdapter,
    created
  );
}

export async function findById(id: string): Promise<Notification | null> {
  const notifications: NotificationRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ id })
    .limit(1);
  const notification = notifications[0];

  if (!notification) { return null; }

  return validate<NotificationRow, Notification>(
    TABLE_NAME,
    isNotificationRow,
    dataAdapter,
    notification
  );
}

export async function findByUserId(
  userId: string,
  options: SearchInterface
): Promise<Notification[]> {
  const collaborators = await CollaboratorsDAO.findByUserId(userId);
  const notifications: NotificationRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ recipient_user_id: userId })
    .orWhereIn(
      'collaborator_id',
      collaborators.map((collaborator: Collaborator): string => {
        return collaborator.id;
      })
    )
    .orderBy('created_at', 'desc')
    .limit(options.limit)
    .offset(options.offset);

  return validateEvery<NotificationRow, Notification>(
    TABLE_NAME,
    isNotificationRow,
    dataAdapter,
    notifications
  );
}

/**
 * Delete recent identical notifications, i.e. to batch up groups of many
 * "someone edited this text" actions into one single message.
 *
 * Note that the interval here does *not* have to be kept in sync with the
 * `purge-notification` stuff. It only represents the length of time during
 * which related notifications are considered to be the same action. In fact, we
 * might even want to experiment with lowering it to make sure we're getting
 * granular enough changes.
 */
export async function deleteRecent(data: Uninserted<Notification>): Promise<number> {
  const rowData = omit(dataAdapter.forInsertion(data), 'id', 'created_at');

  const now = Date.now();
  // 5 minutes ago
  const startingThreshold = now - (1000 * 60 * 5);
  const deletedRows: number = await db(TABLE_NAME)
    .where(rowData)
    .andWhere('created_at', '>', (new Date(startingThreshold)).toISOString())
    .andWhere({ sent_email_at: null })
    .del();

  return deletedRows;
}
