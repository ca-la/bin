import Knex from 'knex';
import db from '../db';
import * as TasksDAO from '../../dao/tasks';
import * as TaskEventsDAO from '../../dao/task-events';
import * as ProductDesignStageTasksDAO from '../../dao/product-design-stage-tasks';
import TaskEvent, {
  DetailsTaskWithAssignees
} from '../../domain-objects/task-event';

function createWithTransaction(
  taskId: string,
  taskEvent: Unsaved<TaskEvent>,
  stageId?: string
): (trx: Knex.Transaction) => Promise<TaskEvent> {
  return async (trx: Knex.Transaction): Promise<TaskEvent> => {
    await TasksDAO.create(taskId, trx);
    const task = await TaskEventsDAO.create(taskEvent, trx);
    if (!task) {
      throw new Error('Could not create task!');
    }

    if (stageId) {
      await ProductDesignStageTasksDAO.create(
        {
          designStageId: stageId,
          taskId
        },
        trx
      );
    }
    return task;
  };
}

export default async function createTask(
  taskId: string,
  taskEvent: Unsaved<TaskEvent>,
  stageId?: string,
  trx?: Knex.Transaction
): Promise<DetailsTaskWithAssignees> {
  const create = createWithTransaction(taskId, taskEvent, stageId);
  return trx ? create(trx) : db.transaction(create);
}

export async function createTasks(
  tasks: Unsaved<TaskEvent>[],
  trx: Knex.Transaction
): Promise<TaskEvent[]> {
  const taskIds = tasks.map((task: Unsaved<TaskEvent>) => task.taskId);
  const stageTasks = tasks.map((task: Unsaved<TaskEvent>) => ({
    designStageId: task.designStageId as string,
    taskId: task.taskId
  }));
  await TasksDAO.createAll(taskIds, trx);
  const taskEvents = await TaskEventsDAO.createAll(tasks, trx);
  await ProductDesignStageTasksDAO.createAll(stageTasks, trx);
  return taskEvents;
}
