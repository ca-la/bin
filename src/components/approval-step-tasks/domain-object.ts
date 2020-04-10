import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';
import Task, { isTaskRow, TaskRow } from '../../domain-objects/task';

export default interface ApprovalStepTask {
  taskId: string;
  approvalStepId: string;
}

export interface ApprovalStepTaskRow {
  task_id: string;
  approval_step_id: string;
}

export const dataAdapter = new DataAdapter<
  ApprovalStepTaskRow,
  ApprovalStepTask
>();

export function isApprovalStepTaskRow(row: object): row is ApprovalStepTaskRow {
  return hasProperties(row, 'task_id', 'approval_step_id');
}

export interface TaskWithMeta extends Task {
  approvalStepId: string;
}

export interface TaskWithMetaRow extends TaskRow {
  approval_step_id: string;
}

export const withMetaDataAdapter = new DataAdapter<
  TaskWithMetaRow,
  TaskWithMeta
>();

export function isTaskWithMetaRow(row: object): row is TaskWithMetaRow {
  return isTaskRow && hasProperties(row, 'ApprovalStep_id');
}
