import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

/**
 * @typedef {object} ComponentRelationship A relationship between two
 * components which are somehow connected.
 *
 * @property {string} id Primary ID
 * @property {Date} createdAt Date when this record was created
 * @property {string} sourceComponentId The base component that the target is applied to
 * @property {string} targetComponentId The component being "applied" to the source
 * @property {string} processId The process by which they are connected
 * @property {number} relativeX The X-offset of the "target" component relative to
 * the "source" component
 * @property {number} relativeY The Y-offset of the "target" component relative to
 * the "source" component
 */
export default interface ComponentRelationship {
  id: string;
  createdAt: Date;
  sourceComponentId: string;
  targetComponentId: string;
  processId: string;
  relativeX: number;
  relativeY: number;
}

export interface ComponentRelationshipRow {
  id: string;
  created_at: Date;
  source_component_id: string;
  target_component_id: string;
  process_id: string;
  relative_x: number;
  relative_y: number;
}

export const dataAdapter = new DataAdapter<ComponentRelationshipRow, ComponentRelationship>();

export function isComponentRelationshipRow(row: object): row is ComponentRelationshipRow {
  return hasProperties(
    row,
    'id',
    'created_at',
    'source_component_id',
    'target_component_id',
    'process_id',
    'relative_x',
    'relative_y'
  );
}
