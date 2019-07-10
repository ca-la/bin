import * as Knex from 'knex';
import { omit } from 'lodash';

import * as db from '../../services/db';
import first from '../../services/first';
import {
  dataAdapter,
  DEPRECATED_NOTIFICATION_TYPES,
  isNotificationRow,
  Notification,
  NotificationRow
} from './domain-object';
import { validate, validateEvery } from '../../services/validate-from-db';
import { announceNotificationCreation } from '../iris/messages/notification';

interface SearchInterface {
  limit: number;
  offset: number;
}

const TABLE_NAME = 'notifications';
const DELAY_MINUTES = 10;

/**
 * Returns all outstanding notifications (e.g. not sent) with associated objects attached.
 */
export async function findOutstanding(
  trx?: Knex.Transaction
): Promise<Notification[]> {
  const outstandingNotifications: NotificationRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ sent_email_at: null, read_at: null })
    .whereNot({ recipient_user_id: null })
    .andWhereRaw(`created_at < NOW() - INTERVAL '${DELAY_MINUTES} minutes'`)
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

export async function markSent(
  ids: string[],
  trx?: Knex.Transaction
): Promise<Notification[]> {
  const updatedNotifications: NotificationRow[] = await db(TABLE_NAME)
    .whereIn('id', ids)
    .update({ sent_email_at: new Date().toISOString() }, '*')
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

export async function markRead(
  ids: string[],
  trx?: Knex.Transaction
): Promise<Notification[]> {
  const updatedNotifications: NotificationRow[] = await db(TABLE_NAME)
    .whereIn('id', ids)
    .update({ read_at: new Date().toISOString() }, '*')
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

export async function create(
  data: Uninserted<Notification>
): Promise<Notification> {
  const rowData = dataAdapter.forInsertion(data);
  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .then((rows: NotificationRow[]) => first<NotificationRow>(rows));

  if (!created) {
    throw new Error('Failed to create a notification!');
  }

  const notification = validate<NotificationRow, Notification>(
    TABLE_NAME,
    isNotificationRow,
    dataAdapter,
    created
  );
  await announceNotificationCreation(notification);
  return notification;
}

export async function findById(id: string): Promise<Notification | null> {
  const notifications: NotificationRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ id })
    .limit(1);
  const notification = notifications[0];

  if (!notification) {
    return null;
  }

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
  const notifications: NotificationRow[] = await db(TABLE_NAME)
    .select('n.*')
    .from('notifications as n')
    .joinRaw(
      `
    left join product_designs as d
      on d.id = n.design_id
    left join collections as c
      on c.id = n.collection_id
    left join comments as co
      on co.id = n.comment_id
    left join collaborators as cl
      on cl.id = n.collaborator_id
    left join product_design_canvas_annotations as a
      on a.id = n.annotation_id
    left join product_design_canvases as can
      on can.id = n.canvas_id
    left join product_design_canvas_measurements as m
      on m.id = n.measurement_id
    `
    )
    .whereNotIn('type', DEPRECATED_NOTIFICATION_TYPES)
    .andWhere({
      'a.deleted_at': null,
      'c.deleted_at': null,
      'can.deleted_at': null,
      'co.deleted_at': null,
      'd.deleted_at': null,
      'm.deleted_at': null
    })
    .andWhereRaw(
      `
      (cl.cancelled_at is null or cl.cancelled_at > now())
    `
    )
    .andWhere((query: Knex.QueryBuilder) =>
      query
        .where({ 'n.recipient_user_id': userId })
        .orWhere({ 'cl.user_id': userId })
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

export async function findUnreadCountByUserId(userId: string): Promise<number> {
  const notificationRows: NotificationRow[] = await db(TABLE_NAME)
    .select('n.*')
    .from('notifications as n')
    .joinRaw(
      `
    left join product_designs as d
      on d.id = n.design_id
    left join collections as c
      on c.id = n.collection_id
    left join comments as co
      on co.id = n.comment_id
    left join collaborators as cl
      on cl.id = n.collaborator_id
    left join product_design_canvas_annotations as a
      on a.id = n.annotation_id
    left join product_design_canvases as can
      on can.id = n.canvas_id
    left join product_design_canvas_measurements as m
      on m.id = n.measurement_id
    `
    )
    .whereNotIn('type', DEPRECATED_NOTIFICATION_TYPES)
    .andWhere({
      'a.deleted_at': null,
      'c.deleted_at': null,
      'can.deleted_at': null,
      'co.deleted_at': null,
      'd.deleted_at': null,
      'm.deleted_at': null,
      'n.read_at': null
    })
    .andWhereRaw(
      `
      (cl.cancelled_at is null or cl.cancelled_at > now())
    `
    )
    .andWhere((query: Knex.QueryBuilder) =>
      query
        .where({ 'n.recipient_user_id': userId })
        .orWhere({ 'cl.user_id': userId })
    );

  const notifications = validateEvery<NotificationRow, Notification>(
    TABLE_NAME,
    isNotificationRow,
    dataAdapter,
    notificationRows
  );

  return notifications.length;
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
export async function deleteRecent(
  data: Uninserted<Notification>
): Promise<number> {
  const rowData = omit(dataAdapter.forInsertion(data), 'id', 'created_at');

  const now = Date.now();
  // 5 minutes ago
  const startingThreshold = now - 1000 * 60 * 5;
  const deletedRows: number = await db(TABLE_NAME)
    .where(rowData)
    .andWhere('created_at', '>', new Date(startingThreshold).toISOString())
    .andWhere({ sent_email_at: null })
    .del();

  return deletedRows;
}
