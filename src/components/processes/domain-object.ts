import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';
import { ComponentType } from '../components/domain-object';

/**
 * A way in which two components can be connected.
 */
export default interface Process {
  componentType: ComponentType | null;
  createdAt: Date;
  createdBy: string;
  deletedAt: Date | null;
  id: string;
  name: string;
  ordering: number;
}

export interface ProcessRow {
  component_type: ComponentType | null;
  created_at: Date;
  created_by: string;
  deleted_at: Date | null;
  id: string;
  name: string;
  ordering: number;
}

export const dataAdapter = new DataAdapter<ProcessRow, Process>();

export function isProcessRow(row: object): row is ProcessRow {
  return hasProperties(
    row,
    'component_type',
    'created_at',
    'created_by',
    'deleted_at',
    'id',
    'name',
    'ordering'
  );
}
