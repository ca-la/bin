import * as uuid from 'node-uuid';

import TaskEvent, {
  DetailsTask,
  TaskStatus
} from '../../domain-objects/task-event';
import { create } from '../../dao/task-events';
import { create as createStageTask } from '../../dao/product-design-stage-tasks';
import * as DesignStagesDAO from '../../dao/product-design-stages';
import { findById as findUserById } from '../../components/users/dao';
import { create as createTask } from '../../dao/tasks';
import createUser = require('../create-user');
import User from '../../components/users/domain-object';
import generateProductDesignStage from './product-design-stage';
import ProductDesignStage from '../../domain-objects/product-design-stage';

export default async function generateTask(
  options: Partial<TaskEvent> = {}
): Promise<{ task: DetailsTask; createdBy: User; stage: ProductDesignStage }> {
  const { user } = options.createdBy
    ? { user: await findUserById(options.createdBy) }
    : await createUser({ withSession: false });
  const task = await createTask(uuid.v4());
  const { stage } = options.designStageId
    ? { stage: await DesignStagesDAO.findById(options.designStageId) }
    : await generateProductDesignStage({}, user.id);

  if (!stage) {
    throw new Error('Could not create stage');
  }

  await createStageTask({
    designStageId: stage.id,
    taskId: task.id
  });

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
    stage,
    task: detailsTask
  };
}
