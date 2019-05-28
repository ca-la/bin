import * as uuid from 'node-uuid';
import * as Knex from 'knex';

import * as db from '../../services/db';
import DesignEvent, {
  dataAdapter,
  DesignEventRow,
  isDesignEventRow
} from '../../domain-objects/design-event';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';

const TABLE_NAME = 'design_events';

export async function create(
  event: DesignEvent,
  trx?: Knex.Transaction
): Promise<DesignEvent> {
  const rowData = dataAdapter.forInsertion(event);

  const created = await db(TABLE_NAME)
    .insert(rowData)
    .returning('*')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: DesignEventRow[]) => first(rows));

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
