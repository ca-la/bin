import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

/**
 * @typedef {object} CollectionStageTask A joining row between collection-stages and tasks
 *
 * @property {string} id The primary id
 * @property {string} collectionStageId The id of the collection stage
 * @property {string} taskId The id of the task
 * @property {Date} createdAt Date when this record was created
 */

export default interface CollectionStageTask {
  collectionStageId: string;
  createdAt: Date;
  id: string;
  taskId: string;
}

export interface CollectionStageTaskRow {
  id: string;
  task_id: string;
  collection_stage_id: string;
  created_at: Date;
}

export const dataAdapter = new DataAdapter<CollectionStageTaskRow, CollectionStageTask>();

export function isCollectionStageTaskRow(row: object): row is CollectionStageTaskRow {
  return hasProperties(
    row,
    'id',
    'task_id',
    'created_at',
    'collection_stage_id'
  );
}
