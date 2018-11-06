import * as db from '../../services/db';
import DesignEvent, {
  dataAdapter,
  DesignEventRow,
  isDesignEventRow
} from '../../domain-objects/design-event';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';

const TABLE_NAME = 'design_events';

export async function create(event: DesignEvent): Promise<DesignEvent> {
  const rowData = dataAdapter.forInsertion(event);

  const created = await db(TABLE_NAME)
    .insert(rowData)
    .returning('*')
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

export async function createAll(events: DesignEvent[]): Promise<DesignEvent[]> {
  const rowData = events.map(dataAdapter.forInsertion.bind(dataAdapter));
  const ids = events.map((event: DesignEvent) => event.id);

  await db(TABLE_NAME)
    .insert(rowData)
    .returning('*');
  const created = await db(TABLE_NAME)
    .select('*')
    .whereIn('id', ids)
    .orderBy('created_at', 'asc');

  return validateEvery<DesignEventRow, DesignEvent>(
    TABLE_NAME,
    isDesignEventRow,
    dataAdapter,
    created
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
