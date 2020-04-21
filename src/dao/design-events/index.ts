import uuid from 'node-uuid';
import rethrow from 'pg-rethrow';
import Knex from 'knex';

import db from '../../services/db';
import DesignEvent, {
  dataAdapter,
  DesignEventRow,
  DesignEventWithUserMeta,
  DesignEventWithUserMetaRow,
  isDesignEventRow,
  isDesignEventWithUserMetaRow,
  withUserMetaDataAdapter
} from '../../domain-objects/design-event';
import first from '../../services/first';
import filterError = require('../../services/filter-error');
import { validate, validateEvery } from '../../services/validate-from-db';

const TABLE_NAME = 'design_events';

export class DuplicateAcceptRejectError extends Error {
  constructor(message: string) {
    super(message);
    this.message = message;
    this.name = 'DuplicateAcceptRejectError';
  }
}

export async function create(
  event: DesignEvent,
  trx?: Knex.Transaction
): Promise<DesignEvent> {
  const rowData = {
    ...dataAdapter.forInsertion(event),
    created_at: new Date()
  };

  const created = await db(TABLE_NAME)
    .insert(rowData)
    .returning('*')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
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

export async function findApprovalStepEvents(
  designId: string,
  approvalStepId: string
): Promise<DesignEventWithUserMeta[]> {
  const designRows = await db(TABLE_NAME)
    .select([
      'design_events.*',
      'actor.name as actor_name',
      'actor.role as actor_role',
      'actor.email as actor_email',
      'target.name as target_name',
      'target.role as target_role',
      'target.email as target_email'
    ])
    .join('users as actor', 'actor.id', 'design_events.actor_id')
    .leftJoin('users as target', 'target.id', 'design_events.target_id')
    .orderBy('design_events.created_at', 'asc')
    .whereRaw(
      `design_id = ? AND (approval_step_id = ? OR approval_step_id IS NULL)`,
      [designId, approvalStepId]
    );
  return validateEvery<DesignEventWithUserMetaRow, DesignEventWithUserMeta>(
    TABLE_NAME,
    isDesignEventWithUserMetaRow,
    withUserMetaDataAdapter,
    designRows
  );
}
