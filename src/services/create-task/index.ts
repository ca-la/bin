import * as Knex from 'knex';
import * as db from '../db';
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
): (trx: Knex.Transaction) => Promise<DetailsTaskWithAssignees> {
  return async (trx: Knex.Transaction): Promise<DetailsTaskWithAssignees> => {
    await TasksDAO.create(taskId, trx);
    const created = await TaskEventsDAO.create(taskEvent, trx);
    if (stageId) {
      await ProductDesignStageTasksDAO.create(
        {
          designStageId: stageId,
          taskId
        },
        trx
      );
    }
    return created;
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
