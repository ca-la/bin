import * as Knex from 'knex';

import * as db from '../../services/db';
import CollaboratorTask, {
  CollaboratorTaskRow,
  dataAdapter,
  isCollaboratorTaskRow
} from '../../domain-objects/collaborator-task';
import first from '../../services/first';
import Collaborator, {
  CollaboratorWithUser,
  CollaboratorWithUserRow,
  dataWithUserAdapter as collaboratorDataAdapter,
  isCollaboratorWithUserRow
} from '../../components/collaborators/domain-objects/collaborator';
import { validate, validateEvery } from '../../services/validate-from-db';
import { ALIASES, getBuilder } from '../../components/collaborators/view';

const TABLE_NAME = 'collaborator_tasks';

export async function create(
  data: Unsaved<CollaboratorTask>
): Promise<CollaboratorTask> {
  const rowData = dataAdapter.forInsertion({
    ...data
  });
  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .then((rows: CollaboratorTaskRow[]) => first<CollaboratorTaskRow>(rows));

  if (!created) {
    throw new Error('Failed to create rows');
  }

  return validate<CollaboratorTaskRow, CollaboratorTask>(
    TABLE_NAME,
    isCollaboratorTaskRow,
    dataAdapter,
    created
  );
}

export interface CollaboratorsWithTaskId {
  taskId: string;
  collaborators: Collaborator[];
}

export async function createAll(
  collaboratorTasks: CollaboratorsWithTaskId[],
  trx?: Knex.Transaction
): Promise<CollaboratorTask[]> {
  const dataRows = collaboratorTasks.map(
    (collaboratorTask: CollaboratorsWithTaskId) => {
      const { taskId, collaborators } = collaboratorTask;
      if (collaborators.length === 0) {
        throw new Error(
          'At least one collaborator is needed for task assignment'
        );
      }

      return dataAdapter.forInsertion({
        collaboratorId: collaborators[0].id,
        taskId
      });
    }
  );
  const createdRows = await db(TABLE_NAME)
    .insert(dataRows, '*')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  return validateEvery<CollaboratorTaskRow, CollaboratorTask>(
    TABLE_NAME,
    isCollaboratorTaskRow,
    dataAdapter,
    createdRows
  );
}

export async function createAllByCollaboratorIdsAndTaskId(
  collaboratorIds: string[],
  taskId: string,
  trx?: Knex.Transaction
): Promise<CollaboratorTask[]> {
  if (collaboratorIds.length === 0) {
    throw new Error('At least one collaborator is needed for task assignment');
  }

  const dataRows = collaboratorIds.map((collaboratorId: string) => {
    return dataAdapter.forInsertion({
      collaboratorId,
      taskId
    });
  });
  const createdRows: CollaboratorTaskRow[] = await db(TABLE_NAME)
    .insert(dataRows, '*')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  return validateEvery<CollaboratorTaskRow, CollaboratorTask>(
    TABLE_NAME,
    isCollaboratorTaskRow,
    dataAdapter,
    createdRows
  );
}

export async function findAllByTaskId(
  taskId: string
): Promise<CollaboratorTask[]> {
  const collaboratorTasks: CollaboratorTaskRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ task_id: taskId })
    .orderBy('created_at', 'desc');

  return validateEvery<CollaboratorTaskRow, CollaboratorTask>(
    TABLE_NAME,
    isCollaboratorTaskRow,
    dataAdapter,
    collaboratorTasks
  );
}

export async function findAllCollaboratorsByTaskId(
  taskId: string
): Promise<Collaborator[]> {
  const collaborators: CollaboratorWithUserRow[] = await getBuilder()
    .innerJoin(
      'collaborator_tasks',
      'collaborator_tasks.collaborator_id',
      ALIASES.collaboratorId
    )
    .where({ 'collaborator_tasks.task_id': taskId })
    .orderBy('collaborator_tasks.created_at', 'desc');

  return validateEvery<CollaboratorWithUserRow, CollaboratorWithUser>(
    TABLE_NAME,
    isCollaboratorWithUserRow,
    collaboratorDataAdapter,
    collaborators
  );
}

export async function deleteAllByCollaboratorIdsAndTaskId(
  collaboratorIds: string[],
  taskId: string
): Promise<number> {
  return await db(TABLE_NAME)
    .whereIn('collaborator_id', collaboratorIds)
    .where({ task_id: taskId })
    .del();
}
