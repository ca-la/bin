import * as uuid from 'node-uuid';

import TaskEvent, { DetailsTask, TaskStatus } from '../../domain-objects/task-event';
import { create } from '../../dao/task-events';
import { create as createStageTask } from '../../dao/product-design-stage-tasks';
import { findById as findUserById } from '../../dao/users';
import { create as createTask } from '../../dao/tasks';
import createUser = require('../create-user');
import User from '../../domain-objects/user';

export default async function generateTask(
  options: Partial<TaskEvent> = {}
): Promise<{ task: DetailsTask, createdBy: User }> {
  const { user } = options.createdBy
    ? { user: await findUserById(options.createdBy) }
    : await createUser({ withSession: false });
  const task = await createTask(uuid.v4());

  if (options.designStageId) {
    await createStageTask({
      designStageId: options.designStageId,
      taskId: task.id
    });
  }

  const detailsTask = await create({
    createdBy: user.id,
    description: options.description || '',
    designStageId: options.designStageId || null,
    dueDate: options.dueDate || null,
    ordering: options.ordering || 0,
    status: options.status || TaskStatus.NOT_STARTED,
    taskId: task.id,
    title: options.title || 'My First Task'
  });

  return {
    createdBy: user,
    task: detailsTask
  };
}
