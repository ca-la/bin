import * as uuid from 'node-uuid';

import * as db from '../../services/db';
import UserTask, {
  dataAdapter,
  isUserTaskRow,
  UserTaskRow
} from '../../domain-objects/user-task';
import PublicUser, {
  dataAdapter as publicUserDataAdapter,
  isPublicUserRow,
  PublicUserRow
} from '../../domain-objects/public-user';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';

const TABLE_NAME = 'user_tasks';
const USERS_TABLE = 'users';

export async function create(
  data: Unsaved<UserTask>
): Promise<UserTask> {
  const rowData = dataAdapter.forInsertion({
    ...data,
    id: uuid.v4()
  });
  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .then((rows: UserTaskRow[]) => first<UserTaskRow>(rows));

  if (!created) { throw new Error('Failed to create rows'); }

  return validate<UserTaskRow, UserTask>(
    TABLE_NAME,
    isUserTaskRow,
    dataAdapter,
    created
  );
}

export async function createAllByUserIdsAndTaskId(
  userIds: string[],
  taskId: string
): Promise<UserTask[]> {
  if (userIds.length === 0) {
    throw new Error('At least one user is needed for task assignment');
  }

  const dataRows = userIds.map((userId: string) => {
    return dataAdapter.forInsertion({
      id: uuid.v4(),
      taskId,
      userId
    });
  });
  const createdRows: UserTaskRow[] = await db(TABLE_NAME).insert(dataRows, '*');
  return validateEvery<UserTaskRow, UserTask>(
    TABLE_NAME,
    isUserTaskRow,
    dataAdapter,
    createdRows
  );
}

export async function findById(id: string): Promise<UserTask | null> {
  const userTasks: UserTaskRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ id })
    .limit(1);

  const userTask = userTasks[0];

  if (!userTask) { return null; }

  return validate<UserTaskRow, UserTask>(
    TABLE_NAME,
    isUserTaskRow,
    dataAdapter,
    userTask
  );
}

export async function findAllByTaskId(taskId: string): Promise<UserTask[]> {
  const userTasks: UserTaskRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ task_id: taskId })
    .orderBy('created_at', 'desc');

  return validateEvery<UserTaskRow, UserTask>(
    TABLE_NAME,
    isUserTaskRow,
    dataAdapter,
    userTasks
  );
}

export async function findAllUsersByTaskId(taskId: string): Promise<PublicUser[]> {
  const users: PublicUserRow[] = await db(USERS_TABLE)
    .select('users.id', 'users.name', 'users.referral_code')
    .innerJoin(
      'user_tasks',
      'user_tasks.user_id',
      'users.id'
    )
    .where({ 'user_tasks.task_id': taskId })
    .orderBy('user_tasks.created_at', 'desc');

  return validateEvery<PublicUserRow, PublicUser>(
    TABLE_NAME,
    isPublicUserRow,
    publicUserDataAdapter,
    users
  );
}

export async function deleteAllByUserIdsAndTaskId(
  userIds: string[],
  taskId: string
): Promise<number> {
  return await db(TABLE_NAME)
    .whereIn('user_id', userIds)
    .where({ task_id: taskId })
    .del();
}
