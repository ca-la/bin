import * as Knex from 'knex';
import { omit } from 'lodash';

import * as db from '../../services/db';
import first from '../../services/first';
import {
  dataAdapter,
  hydratedDataAdapter,
  HydratedNotification,
  HydratedNotificationRow,
  isHydratedNotificationRow,
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
export async function findOutstanding(trx?: Knex.Transaction): Promise<HydratedNotification[]> {
  const outstandingNotifications: HydratedNotificationRow[] = await db(TABLE_NAME)
    .select(db.raw(`
notifications.*,
to_json(actors.*) as actor,
to_json(annotations.*) as annotation,
to_json(canvases.*) as canvas,
to_json(collections.*) as collection,
to_json(comments.*) as comment,
to_json(designs.*) as design,
to_json(stages.*) as stage,
to_json(tasks.*) as task
      `))
    .joinRaw(`
LEFT JOIN users AS actors
  ON notifications.actor_user_id = actors.id
LEFT JOIN product_design_canvas_annotations AS annotations
  ON notifications.annotation_id = annotations.id
LEFT JOIN product_design_canvases AS canvases
  ON notifications.canvas_id = canvases.id
LEFT JOIN collections
  ON notifications.collection_id = collections.id
LEFT JOIN comments
  ON notifications.comment_id = comments.id
LEFT JOIN product_designs AS designs
  ON notifications.design_id = designs.id
LEFT JOIN product_design_stages AS stages
  ON notifications.stage_id = stages.id
LEFT JOIN (SELECT * FROM task_events ORDER BY created_at ASC LIMIT 1) AS tasks
  ON notifications.task_id = tasks.task_id
    `)
    .where({ sent_email_at: null })
    .whereNot({ recipient_user_id: null })
    .orderBy('created_at', 'desc')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  return validateEvery<HydratedNotificationRow, HydratedNotification>(
    TABLE_NAME,
    isHydratedNotificationRow,
    hydratedDataAdapter,
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
    dataAdapter<Notification>(),
    updatedNotifications
  );
}

export async function create<T extends Notification>(data: Uninserted<T>): Promise<T> {
  const rowData = dataAdapter<T>().forInsertion(data);
  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .then((rows: NotificationRow[]) => first<NotificationRow>(rows));

  if (!created) { throw new Error('Failed to create a notification!'); }

  return validate<NotificationRow, T>(
    TABLE_NAME,
    isNotificationRow,
    dataAdapter<T>(),
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
    dataAdapter<Notification>(),
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
    dataAdapter<Notification>(),
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
  const rowData = omit(dataAdapter<Notification>().forInsertion(data), 'id', 'created_at');

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
