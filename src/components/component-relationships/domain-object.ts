import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';

/**
 * A relationship between two components which are connected via a process.
 */
export default interface ComponentRelationship {
  createdAt: Date;
  createdBy: string;
  deletedAt: Date | null;
  id: string;
  processId: string;
  relativeX: number;
  relativeY: number;
  sourceComponentId: string;
  targetComponentId: string;
}

export interface ComponentRelationshipRow {
  created_at: Date;
  created_by: string;
  deleted_at: Date | null;
  id: string;
  process_id: string;
  relative_x: number;
  relative_y: number;
  source_component_id: string;
  target_component_id: string;
}

export const dataAdapter = new DataAdapter<
  ComponentRelationshipRow,
  ComponentRelationship
>();

export function isComponentRelationshipRow(
  row: object
): row is ComponentRelationshipRow {
  return hasProperties(
    row,
    'created_at',
    'created_by',
    'deleted_at',
    'id',
    'process_id',
    'relative_x',
    'relative_y',
    'source_component_id',
    'target_component_id'
  );
}
