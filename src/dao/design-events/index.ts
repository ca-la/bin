import uuid from 'node-uuid';
import rethrow from 'pg-rethrow';
import Knex from 'knex';

import db from '../../services/db';
import DesignEvent, {
  dataAdapter,
  DesignEventRow,
  DesignEventWithMeta,
  DesignEventWithMetaRow,
  isDesignEventRow,
  isDesignEventWithMetaRow,
  withMetaDataAdapter,
  DesignEventTypes
} from '../../domain-objects/design-event';
import first from '../../services/first';
import filterError = require('../../services/filter-error');
import { validate, validateEvery } from '../../services/validate-from-db';
import { taskTypesById } from '../../components/tasks/templates';
import { actualizeDesignStepsAfterBidAcceptance } from '../../services/approval-step-state';

const TABLE_NAME = 'design_events';

const ACTIVITY_STREAM_EVENTS: DesignEventTypes[] = [
  'REVISION_REQUEST',
  'STEP_ASSIGNMENT',
  'STEP_SUMBISSION_APPROVAL',
  'STEP_SUMBISSION_ASSIGNMENT',
  'STEP_COMPLETE',
  'STEP_REOPEN',
  'SUBMIT_DESIGN',
  'COMMIT_QUOTE',
  'ACCEPT_SERVICE_BID'
];

export class DuplicateAcceptRejectError extends Error {
  constructor(message: string) {
    super(message);
    this.message = message;
    this.name = 'DuplicateAcceptRejectError';
  }
}

export async function create(
  trx: Knex.Transaction,
  event: DesignEvent
): Promise<DesignEvent> {
  const rowData = {
    ...dataAdapter.forInsertion(event),
    created_at: new Date()
  };

  const created = await trx(TABLE_NAME)
    .insert(rowData)
    .returning('*')
    .then((rows: DesignEventRow[]) => first(rows))
    .catch(rethrow)
    .catch(
      filterError(
        rethrow.ERRORS.UniqueViolation,
        (err: typeof rethrow.ERRORS.UniqueViolation) => {
          if (err.constraint === 'one_accept_or_reject_per_bid') {
            throw new DuplicateAcceptRejectError(
              'This bid has already been accepted or rejected'
            );
          }
          throw err;
        }
      )
    );

  if (!created) {
    throw new Error('Failed to create DesignEvent');
  }
  switch (event.type) {
    case 'ACCEPT_SERVICE_BID':
      if (!event.bidId) {
        throw new Error('bidId is missing');
      }
      await actualizeDesignStepsAfterBidAcceptance(
        trx,
        event.bidId,
        event.designId
      );
      break;
  }

  return validate<DesignEventRow, DesignEvent>(
    TABLE_NAME,
    isDesignEventRow,
    dataAdapter,
    created
  );
}

export async function createAll(
  events: MaybeUnsaved<DesignEvent>[]
): Promise<DesignEvent[]> {
  if (events.length === 0) {
    return [];
  }

  const rowData = events.map((event: MaybeUnsaved<DesignEvent>) => {
    return dataAdapter.forInsertion({
      id: uuid.v4(),
      ...event
    });
  });

  const created = await db(TABLE_NAME)
    .insert(rowData)
    .returning('*');

  const sorted = created.sort(
    (a: DesignEventRow, b: DesignEventRow) =>
      a.created_at.getTime() - b.created_at.getTime()
  );

  return validateEvery<DesignEventRow, DesignEvent>(
    TABLE_NAME,
    isDesignEventRow,
    dataAdapter,
    sorted
  );
}

export async function findByTargetId(targetId: string): Promise<DesignEvent[]> {
  const targetRows = await db(TABLE_NAME)
    .select('*')
    .orderBy('created_at', 'asc')
    .where({ target_id: targetId });

  return validateEvery<DesignEventRow, DesignEvent>(
    TABLE_NAME,
    isDesignEventRow,
    dataAdapter,
    targetRows
  );
}

export async function findByDesignId(designId: string): Promise<DesignEvent[]> {
  const designRows = await db(TABLE_NAME)
    .select('*')
    .orderBy('created_at', 'asc')
    .where({ design_id: designId });

  return validateEvery<DesignEventRow, DesignEvent>(
    TABLE_NAME,
    isDesignEventRow,
    dataAdapter,
    designRows
  );
}

export async function isQuoteCommitted(designId: string): Promise<boolean> {
  const designEvents = await findByDesignId(designId);
  return designEvents.some(
    (event: DesignEvent) => event.type === 'COMMIT_QUOTE'
  );
}

function addMeta(query: Knex.QueryBuilder): Knex.QueryBuilder {
  return query
    .select([
      'actor.name as actor_name',
      'actor.role as actor_role',
      'actor.email as actor_email',
      'target.name as target_name',
      'target.role as target_role',
      'target.email as target_email',
      'design_approval_submissions.title as submission_title',
      'design_approval_steps.title as step_title',
      db.raw(
        `(
          SELECT COALESCE(jsonb_agg(task_type_id), '[]')
          FROM bid_task_types
          WHERE pricing_bid_id = design_events.bid_id
        ) AS task_type_ids`
      )
    ])
    .join('users as actor', 'actor.id', 'design_events.actor_id')
    .leftJoin('users as target', 'target.id', 'design_events.target_id')
    .leftJoin(
      'design_approval_submissions',
      'design_approval_submissions.id',
      'design_events.approval_submission_id'
    )
    .leftJoin(
      'design_approval_steps',
      'design_approval_steps.id',
      'design_events.approval_step_id'
    );
}

export async function findApprovalStepEvents(
  trx: Knex.Transaction,
  designId: string,
  approvalStepId: string
): Promise<DesignEventWithMeta[]> {
  const designRows = (await trx(TABLE_NAME)
    .select('design_events.*')
    .modify(addMeta)
    .orderBy('design_events.created_at', 'asc')
    .whereIn('design_events.type', ACTIVITY_STREAM_EVENTS)
    .whereRaw(
      `design_events.design_id = ? AND (approval_step_id = ? OR approval_step_id IS NULL)`,
      [designId, approvalStepId]
    )).map((item: DesignEventWithMetaRow) => {
    return {
      ...item,
      task_type_titles: item.task_type_ids.map((typeId: string) =>
        taskTypesById[typeId] ? taskTypesById[typeId].title : 'Unknown task'
      )
    };
  });
  return validateEvery<DesignEventWithMetaRow, DesignEventWithMeta>(
    TABLE_NAME,
    isDesignEventWithMetaRow,
    withMetaDataAdapter,
    designRows
  );
}

export async function findById(
  trx: Knex.Transaction,
  id: string
): Promise<DesignEventWithMeta | null> {
  const designEvent = await trx(TABLE_NAME)
    .select('design_events.*')
    .modify(addMeta)
    .where({ 'design_events.id': id })
    .first();

  if (!designEvent) {
    return null;
  }

  return validate<DesignEventWithMetaRow, DesignEventWithMeta>(
    TABLE_NAME,
    isDesignEventWithMetaRow,
    withMetaDataAdapter,
    designEvent
  );
}
