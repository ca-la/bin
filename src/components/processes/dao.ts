import * as uuid from 'node-uuid';

import * as db from '../../services/db';
import Process, {
  dataAdapter,
  isProcessRow,
  ProcessRow
} from './domain-object';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';
import { ComponentType } from '../../domain-objects/component';

const TABLE_NAME = 'processes';

export async function create(data: MaybeUnsaved<Process>): Promise<Process> {
  const rowData = dataAdapter.forInsertion({
    id: uuid.v4(),
    ...data,
    deletedAt: null
  });
  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .then((rows: ProcessRow[]) => first<ProcessRow>(rows));

  if (!created) {
    throw new Error('Failed to create a process!');
  }

  return validate<ProcessRow, Process>(
    TABLE_NAME,
    isProcessRow,
    dataAdapter,
    created
  );
}

export async function findById(id: string): Promise<Process | null> {
  const process = await db(TABLE_NAME)
    .select('*')
    .where({ id, deleted_at: null })
    .limit(1)
    .then((rows: ProcessRow[]) => first<ProcessRow>(rows));

  if (!process) {
    return null;
  }

  return validate<ProcessRow, Process>(
    TABLE_NAME,
    isProcessRow,
    dataAdapter,
    process
  );
}

/**
 * Returns every non-deleted process, ordered by its ordering and component type.
 */
export async function findAll(): Promise<Process[]> {
  const processes = await db(TABLE_NAME)
    .select('*')
    .where({ deleted_at: null })
    .orderBy('component_type', 'asc')
    .orderBy('ordering', 'asc');

  return validateEvery<ProcessRow, Process>(
    TABLE_NAME,
    isProcessRow,
    dataAdapter,
    processes
  );
}

/**
 * Returns every non-deleted process for a given component type, ordered by its ordering.
 */
export async function findAllByComponentType(
  type: ComponentType
): Promise<Process[]> {
  const processes = await db(TABLE_NAME)
    .select('*')
    .where({ component_type: type, deleted_at: null })
    .orderBy('ordering', 'asc');

  return validateEvery<ProcessRow, Process>(
    TABLE_NAME,
    isProcessRow,
    dataAdapter,
    processes
  );
}
