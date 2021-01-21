import Knex from "knex";
import { TaskEvent } from "@cala/ts-lib";
import db from "../db";
import * as TasksDAO from "../../dao/tasks";
import * as TaskEventsDAO from "../../dao/task-events";
import * as ProductDesignStageTasksDAO from "../../dao/product-design-stage-tasks";
import * as ApprovalStepTasksDAO from "../../components/approval-step-tasks/dao";

function createWithTransaction(
  taskId: string,
  taskEvent: Unsaved<TaskEvent>,
  stageId?: string,
  approvalStepId?: string
): (trx: Knex.Transaction) => Promise<TaskEvent> {
  return async (trx: Knex.Transaction): Promise<TaskEvent> => {
    await TasksDAO.create(taskId, trx);
    const task = await TaskEventsDAO.create(taskEvent, trx);
    if (!task) {
      throw new Error("Could not create task!");
    }

    if (stageId) {
      await ProductDesignStageTasksDAO.create(
        {
          designStageId: stageId,
          taskId,
        },
        trx
      );
    }
    if (approvalStepId) {
      await ApprovalStepTasksDAO.create(trx, {
        approvalStepId,
        taskId,
      });
    }
    return task;
  };
}

export default async function createTask(
  taskId: string,
  taskEvent: Unsaved<TaskEvent>,
  stageId?: string,
  approvalStepId?: string,
  trx?: Knex.Transaction
): Promise<TaskEvent> {
  const create = createWithTransaction(
    taskId,
    taskEvent,
    stageId,
    approvalStepId
  );
  return trx ? create(trx) : db.transaction(create);
}

export async function createTasks(
  tasks: Unsaved<TaskEvent>[],
  trx: Knex.Transaction
): Promise<TaskEvent[]> {
  const taskIds = tasks.map((task: Unsaved<TaskEvent>) => task.taskId);
  const stageTasks = tasks.map((task: Unsaved<TaskEvent>) => ({
    designStageId: task.designStageId as string,
    taskId: task.taskId,
  }));
  await TasksDAO.createAll(taskIds, trx);
  const taskEvents = await TaskEventsDAO.createAll(tasks, trx);
  await ProductDesignStageTasksDAO.createAll(stageTasks, trx);
  return taskEvents;
}
