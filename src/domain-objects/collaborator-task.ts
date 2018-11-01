import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

/**
 * @typedef {object} CollaboratorTask A joining row between collaborators and tasks
 *
 * @property {string} collaboratorId The id of the collaborator (AKA assignee)
 * @property {string} taskId The id of the task
 * @property {Date} createdAt Date when this record was created
 */

export default interface CollaboratorTask {
  createdAt: Date;
  taskId: string;
  collaboratorId: string;
}

export interface CollaboratorTaskRow {
  created_at: Date;
  task_id: string;
  collaborator_id: string;
}

export const dataAdapter = new DataAdapter<CollaboratorTaskRow, CollaboratorTask>();

export function isCollaboratorTaskRow(row: object): row is CollaboratorTaskRow {
  return hasProperties(
    row,
    'created_at',
    'task_id',
    'collaborator_id'
  );
}
