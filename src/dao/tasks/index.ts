import * as uuid from 'node-uuid';

import * as db from '../../services/db';
import Task, {
  dataAdapter,
  isTaskRow,
  TaskRow
} from '../../domain-objects/task';
import first from '../../services/first';
import { validate } from '../../services/validate-from-db';

const TABLE_NAME = 'tasks';

export async function create(): Promise<Task> {
  const rowData = dataAdapter.forInsertion({
    id: uuid.v4()
  });
  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .then((rows: TaskRow[]) => first<TaskRow>(rows));

  if (!created) { throw new Error('Failed to create rows'); }

  return validate<TaskRow, Task>(
    TABLE_NAME,
    isTaskRow,
    dataAdapter,
    created
  );
}

export async function findById(id: string): Promise<Task | null> {
  const tasks: TaskRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ id })
    .limit(1);

  const task = tasks[0];

  if (!task) { return null; }

  return validate<TaskRow, Task>(
    TABLE_NAME,
    isTaskRow,
    dataAdapter,
    task
  );
}