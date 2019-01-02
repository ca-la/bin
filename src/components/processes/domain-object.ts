import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';

/**
 * A way in which two components can be connected.
 */
export default interface Process {
  createdAt: Date;
  createdBy: string;
  deletedAt: Date | null;
  id: string;
  name: string;
}

export interface ProcessRow {
  created_at: Date;
  created_by: string;
  deleted_at: Date | null;
  id: string;
  name: string;
}

export const dataAdapter = new DataAdapter<ProcessRow, Process>();

export function isProcessRow(row: object): row is ProcessRow {
  return hasProperties(
    row,
    'created_at',
    'created_by',
    'deleted_at',
    'id',
    'name'
  );
}
