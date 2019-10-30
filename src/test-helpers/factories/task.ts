import * as uuid from 'node-uuid';

import TaskEvent, {
  DetailsTask,
  TaskStatus
} from '../../domain-objects/task-event';
import { create, findById } from '../../dao/task-events';
import { create as createStageTask } from '../../dao/product-design-stage-tasks';
import * as DesignStagesDAO from '../../dao/product-design-stages';
import * as DesignsDAO from '../../components/product-designs/dao';
import ProductDesign = require('../../components/product-designs/domain-objects/product-design');
import { findById as findUserById } from '../../components/users/dao';
import { create as createTask } from '../../dao/tasks';
import createUser = require('../create-user');
import User from '../../components/users/domain-object';
import generateProductDesignStage from './product-design-stage';
import ProductDesignStage from '../../domain-objects/product-design-stage';

export default async function generateTask(
  options: Partial<TaskEvent> = {}
): Promise<{
  task: DetailsTask;
  design: ProductDesign;

  createdBy: User;
  stage: ProductDesignStage;
}> {
  const { user } = options.createdBy
    ? { user: await findUserById(options.createdBy) }
    : await createUser({ withSession: false });
  const task = await createTask(uuid.v4());
  let stage;
  let design;
  if (options.designStageId) {
    stage = await DesignStagesDAO.findById(options.designStageId);
    if (!stage) {
      throw new Error('Could not find stage');
    }
    design = await DesignsDAO.findById(stage.designId);
  } else {
    const stageGen = await generateProductDesignStage();
    stage = stageGen.stage;
    design = stageGen.design;
  }

  if (!stage) {
    throw new Error('Could not create stage');
  }

  if (!design) {
    throw new Error('Could not create design');
  }

  await createStageTask({
    designStageId: stage.id,
    taskId: task.id
  });

  const created = await create({
    createdBy: user.id,
    description: options.description || '',
    designStageId: options.designStageId || null,
    dueDate: options.dueDate || null,
    ordering: options.ordering || 0,
    status: options.status || TaskStatus.NOT_STARTED,
    taskId: task.id,
    title: options.title || 'My First Task'
  });

  const detailsTask = await findById(created.taskId);

  if (!detailsTask) {
    throw new Error('Could not create task');
  }

  return {
    createdBy: user,
    design,
    stage,
    task: detailsTask
  };
}
