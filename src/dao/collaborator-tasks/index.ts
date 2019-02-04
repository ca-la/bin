import * as db from '../../services/db';
import CollaboratorTask, {
  CollaboratorTaskRow,
  dataAdapter,
  isCollaboratorTaskRow
} from '../../domain-objects/collaborator-task';
import first from '../../services/first';
import Collaborator, { CollaboratorRow } from '../../components/collaborators/domain-object';
import { validate, validateEvery } from '../../services/validate-from-db';
import { hasProperties } from '../../services/require-properties';
import DataAdapter from '../../services/data-adapter';

const TABLE_NAME = 'collaborator_tasks';
const COLLABORATORS_TABLE = 'collaborators';

export async function create(
  data: Unsaved<CollaboratorTask>
): Promise<CollaboratorTask> {
  const rowData = dataAdapter.forInsertion({
    ...data
  });
  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .then((rows: CollaboratorTaskRow[]) => first<CollaboratorTaskRow>(rows));

  if (!created) { throw new Error('Failed to create rows'); }

  return validate<CollaboratorTaskRow, CollaboratorTask>(
    TABLE_NAME,
    isCollaboratorTaskRow,
    dataAdapter,
    created
  );
}

export async function createAllByCollaboratorIdsAndTaskId(
  collaboratorIds: string[],
  taskId: string
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
  const createdRows: CollaboratorTaskRow[] = await db(TABLE_NAME).insert(dataRows, '*');
  return validateEvery<CollaboratorTaskRow, CollaboratorTask>(
    TABLE_NAME,
    isCollaboratorTaskRow,
    dataAdapter,
    createdRows
  );
}

export async function findAllByTaskId(taskId: string): Promise<CollaboratorTask[]> {
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

const collaboratorDataAdapter = new DataAdapter<CollaboratorRow, Collaborator>();

const isCollaboratorRow = (data: object): data is CollaboratorRow => {
  return hasProperties(
    data,
    'id',
    'collection_id',
    'design_id',
    'user_id',
    'user_email',
    'invitation_message',
    'role',
    'created_at',
    'deleted_at'
  );
};

export async function findAllCollaboratorsByTaskId(taskId: string): Promise<Collaborator[]> {
  const collaborators: CollaboratorRow[] = await db(COLLABORATORS_TABLE)
    .select('collaborators.*')
    .innerJoin(
      'collaborator_tasks',
      'collaborator_tasks.collaborator_id',
      'collaborators.id'
    )
    .where({ 'collaborator_tasks.task_id': taskId })
    .orderBy('collaborator_tasks.created_at', 'desc');

  return validateEvery<CollaboratorRow, Collaborator>(
    TABLE_NAME,
    isCollaboratorRow,
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
