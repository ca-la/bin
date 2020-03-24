import Knex from 'knex';
import { omit } from 'lodash';

import db from '../../services/db';
import first from '../../services/first';
import {
  dataAdapter,
  DEPRECATED_NOTIFICATION_TYPES,
  fullDataAdapter,
  FullNotification,
  FullNotificationRow,
  isFullNotificationRow,
  isNotificationRow,
  Notification,
  NotificationRow,
  partialDataAdapter
} from './domain-object';
import { validate, validateEvery } from '../../services/validate-from-db';
import { announceNotificationCreation } from '../iris/messages/notification';

interface SearchInterface {
  limit: number;
  offset: number;
}

const TABLE_NAME = 'notifications';
export const DELAY_MINUTES = 10;

function addActor(query: Knex.QueryBuilder): Knex.QueryBuilder {
  return query
    .select(
      db.raw(`
  jsonb_build_object(
    'birthday', au.birthday,
    'createdAt', au.created_at,
    'email', au.email,
    'id', au.id,
    'lastAcceptedPartnerTermsAt', au.last_accepted_partner_terms_at,
    'lastAcceptedDesignerTermsAt', au.last_accepted_designer_terms_at,
    'isSmsPreregistration', au.is_sms_preregistration,
    'locale', au.locale,
    'name', au.name,
    'phone', au.phone,
    'referralCode', au.referral_code,
    'role', au.role
  ) AS actor
`)
    )
    .leftJoin('users AS au', 'au.id', 'n.actor_user_id');
}

function addComponentType(query: Knex.QueryBuilder): Knex.QueryBuilder {
  return query
    .select('comp.type as component_type')
    .leftJoin('product_design_canvases as can', 'can.id', 'n.canvas_id')
    .leftJoin('components as comp', 'comp.id', 'can.component_id')
    .whereNull('can.deleted_at');
}

function addCollectionTitle(query: Knex.QueryBuilder): Knex.QueryBuilder {
  return query
    .select('c.title as collection_title')
    .leftJoin('collections as c', 'c.id', 'n.collection_id')
    .whereNull('c.deleted_at');
}

function addDesignTitle(query: Knex.QueryBuilder): Knex.QueryBuilder {
  return query
    .select('d.title as design_title')
    .leftJoin('product_designs as d', 'd.id', 'n.design_id')
    .whereNull('d.deleted_at');
}

function addDesignImages(query: Knex.QueryBuilder): Knex.QueryBuilder {
  return query
    .select(db.raw(`COALESCE(pdi.image_ids, '[]') as design_image_ids`))
    .leftJoin(
      (subquery: Knex.QueryBuilder) =>
        subquery
          .select([
            'pd.id AS design_id',
            db.raw(
              `COALESCE(jsonb_agg(assets.id) FILTER (WHERE assets.id IS NOT NULL), '[]') AS image_ids`
            )
          ])
          .from('product_designs as pd')
          .leftJoin('canvases', (join: Knex.JoinClause) =>
            join
              .on('canvases.design_id', '=', 'pd.id')
              .andOnNull('canvases.deleted_at')
              .andOnNull('canvases.archived_at')
          )
          .leftJoin('components', (join: Knex.JoinClause) =>
            join
              .on('components.id', '=', 'canvases.component_id')
              .andOnNull('components.deleted_at')
          )
          .leftJoin('assets', (join: Knex.JoinClause) =>
            join
              .on('assets.id', '=', 'components.sketch_id')
              .andOnNull('assets.deleted_at')
          )
          .groupBy('pd.id')
          .as('pdi'),
      'pdi.design_id',
      '=',
      'n.design_id'
    );
}

function addCommentText(query: Knex.QueryBuilder): Knex.QueryBuilder {
  return query
    .select('co.text as comment_text')
    .leftJoin('comments as co', 'co.id', 'n.comment_id')
    .whereNull('co.deleted_at');
}

function addHasAttachments(query: Knex.QueryBuilder): Knex.QueryBuilder {
  return query.select(
    db.raw(`
    COALESCE((
      SELECT
        count('*') > 0
      FROM
        comment_attachments AS ca
      WHERE
        ca.comment_id = n.comment_id
      GROUP BY
        n.comment_id
    ), false)
      AS has_attachments`)
  );
}

function addMeasurement(query: Knex.QueryBuilder): Knex.QueryBuilder {
  return query
    .leftJoin(
      'product_design_canvas_measurements as m',
      'm.id',
      'n.measurement_id'
    )
    .whereNull('m.deleted_at');
}

function addAnnotation(query: Knex.QueryBuilder): Knex.QueryBuilder {
  return query
    .leftJoin(
      'product_design_canvas_annotations as a',
      'a.id',
      'n.annotation_id'
    )
    .whereNull('a.deleted_at');
}

function addTaskTitle(query: Knex.QueryBuilder): Knex.QueryBuilder {
  return query.select((subquery: Knex.QueryBuilder) =>
    subquery
      .select('te.title')
      .from('task_events as te')
      .leftJoin('task_events as te2', (join: Knex.JoinClause) =>
        join
          .on('te2.task_id', '=', 'te.task_id')
          .andOn('te2.created_at', '<', 'te.created_at')
      )
      .whereRaw('te.task_id = n.task_id')
      .limit(1)
      .as('task_title')
  );
}

export async function findByUserId(
  trx: Knex.Transaction,
  userId: string,
  options: SearchInterface
): Promise<FullNotification[]> {
  const notifications = await trx
    .select('n.*')
    .from('notifications as n')
    .modify(addActor)
    .modify(addComponentType)
    .modify(addCollectionTitle)
    .modify(addDesignTitle)
    .modify(addDesignImages)
    .modify(addCommentText)
    .modify(addHasAttachments)
    .modify(addMeasurement)
    .modify(addAnnotation)
    .modify(addTaskTitle)
    .leftJoin('collaborators as cl', 'cl.id', 'n.collaborator_id')
    .whereNotIn('n.type', DEPRECATED_NOTIFICATION_TYPES)
    .andWhereRaw('(cl.cancelled_at is null or cl.cancelled_at > now())')
    .andWhere((query: Knex.QueryBuilder) =>
      query
        .where({
          'n.recipient_user_id': userId
        })
        .orWhere({ 'cl.user_id': userId, 'n.recipient_user_id': null })
    )
    .andWhere({ 'n.deleted_at': null })
    .orderBy('created_at', 'desc')
    .limit(options.limit)
    .offset(options.offset);

  return validateEvery<FullNotificationRow, FullNotification>(
    TABLE_NAME,
    isFullNotificationRow,
    fullDataAdapter,
    notifications
  );
}

export async function findById(
  trx: Knex.Transaction,
  notificationId: string
): Promise<FullNotification | null> {
  const notification = await trx
    .select('n.*')
    .from('notifications as n')
    .modify(addActor)
    .modify(addComponentType)
    .modify(addCollectionTitle)
    .modify(addDesignTitle)
    .modify(addDesignImages)
    .modify(addCommentText)
    .modify(addHasAttachments)
    .modify(addMeasurement)
    .modify(addAnnotation)
    .modify(addTaskTitle)
    .leftJoin('collaborators as cl', 'cl.id', 'n.collaborator_id')
    .whereNotIn('n.type', DEPRECATED_NOTIFICATION_TYPES)
    .andWhereRaw('(cl.cancelled_at is null or cl.cancelled_at > now())')
    .andWhere({ 'n.id': notificationId, 'n.deleted_at': null })
    .orderBy('created_at', 'desc')
    .first<FullNotificationRow | null>();

  if (!notification) {
    return null;
  }

  return validate<FullNotificationRow, FullNotification>(
    TABLE_NAME,
    isFullNotificationRow,
    fullDataAdapter,
    notification
  );
}

export async function findOutstanding(
  trx: Knex.Transaction
): Promise<FullNotification[]> {
  const notifications = await trx
    .select('n.*')
    .from('notifications as n')
    .modify(addActor)
    .modify(addComponentType)
    .modify(addCollectionTitle)
    .modify(addDesignTitle)
    .modify(addDesignImages)
    .modify(addCommentText)
    .modify(addHasAttachments)
    .modify(addMeasurement)
    .modify(addAnnotation)
    .modify(addTaskTitle)
    .leftJoin('collaborators as cl', 'cl.id', 'n.collaborator_id')
    .where({ 'n.deleted_at': null, sent_email_at: null, read_at: null })
    .whereNot({ recipient_user_id: null })
    .andWhereRaw(`n.created_at < NOW() - INTERVAL '${DELAY_MINUTES} minutes'`)
    .orderBy('created_at', 'desc');

  return validateEvery<FullNotificationRow, FullNotification>(
    TABLE_NAME,
    isFullNotificationRow,
    fullDataAdapter,
    notifications
  );
}

export async function markSent(
  ids: string[],
  trx?: Knex.Transaction
): Promise<Notification[]> {
  const updatedNotifications: NotificationRow[] = await db(TABLE_NAME)
    .whereIn('id', ids)
    .andWhere({ deleted_at: null })
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
    .andWhere({ deleted_at: null })
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

export async function markReadOlderThan(
  trx: Knex.Transaction,
  notificationId: string,
  recipientUserId: string
): Promise<number> {
  return trx(TABLE_NAME)
    .whereIn('id', (subquery: Knex.QueryBuilder) => {
      subquery
        .select(['n.id'])
        .from('notifications as n')
        .leftJoin('collaborators as cl', 'cl.id', 'n.collaborator_id')
        .whereNotIn('n.type', DEPRECATED_NOTIFICATION_TYPES)
        .andWhere((query: Knex.QueryBuilder) => {
          query
            .where({
              'n.recipient_user_id': recipientUserId
            })
            .orWhere({
              'n.recipient_user_id': null,
              'cl.user_id': recipientUserId
            });
        })
        .andWhere({
          'n.read_at': null,
          'n.deleted_at': null
        })
        .andWhereRaw(
          `
(n.created_at, n.id) <= (
  SELECT n2.created_at, n2.id FROM notifications AS n2
    LEFT JOIN collaborators AS cl ON cl.id = n2.collaborator_id
   WHERE n2.id = :notificationId
     AND (
           n2.recipient_user_id = :recipientUserId
             OR (n2.recipient_user_id IS NULL AND cl.user_id = :recipientUserId)
         )
)`,
          { notificationId, recipientUserId }
        );
    })
    .update({
      read_at: db.fn.now()
    });
}

export async function create(
  data: Uninserted<Notification>,
  trx?: Knex.Transaction
): Promise<FullNotification> {
  const rowData = dataAdapter.forInsertion(data);
  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: NotificationRow[]) => first<NotificationRow>(rows));

  if (!created) {
    throw new Error('Failed to create a notification!');
  }

  let notification;

  if (trx) {
    notification = await findById(trx, created.id);
  } else {
    notification = await db.transaction((newTrx: Knex.Transaction) =>
      findById(newTrx, created.id)
    );
  }

  if (!notification) {
    throw new Error('Failed to find created notification after persisting!');
  }
  await announceNotificationCreation(notification);
  return notification;
}

export async function findUnreadCountByUserId(
  trx: Knex.Transaction,
  userId: string
): Promise<number> {
  const { notificationCount } = await trx(TABLE_NAME)
    .count('n.id', { as: 'notificationCount' })
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
      'n.read_at': null,
      'n.deleted_at': null
    })
    .andWhereRaw(
      `
      (cl.cancelled_at is null or cl.cancelled_at > now())
    `
    )
    .andWhere((query: Knex.QueryBuilder) =>
      query
        .where({
          'n.recipient_user_id': userId
        })
        .orWhere({ 'cl.user_id': userId, 'n.recipient_user_id': null })
    )
    // .count returns `number | string` due to how big ints are stored
    .first<{ notificationCount: number | string }>();

  return Number(notificationCount);
}

export async function del(id: string): Promise<void> {
  const deleted = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update({ deleted_at: new Date() }, '*')
    .then((rows: NotificationRow[]) => first<NotificationRow>(rows));

  if (!deleted) {
    throw new Error('Unable to delete Notification as it was not found.');
  }
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
  data: Uninserted<Partial<Notification>>,
  trx?: Knex.Transaction
): Promise<number> {
  const rowData = omit(
    partialDataAdapter.forInsertion(data),
    'id',
    'created_at'
  );

  const now = Date.now();
  // 5 minutes ago
  const startingThreshold = now - 1000 * 60 * 5;
  const deletedRows: number = await db(TABLE_NAME)
    .where(rowData)
    .andWhere('created_at', '>', new Date(startingThreshold).toISOString())
    .andWhere({ sent_email_at: null })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .del();

  return deletedRows;
}
