import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

/**
 * @typedef {object} Component An element that makes up part of a design
 *
 * @property {string} id Primary ID
 * @property {Date} createdAt Date when this record was created
 * @property {number} [parentId] A reference to the component which is the
 * parent of this in the hierarchy.
 */
export default interface Component {
  id: string;
  createdAt: Date;
  parentId?: string;
}

export interface ComponentRow {
  id: string;
  parent_id: string | null;
  created_at: Date;
}

export const dataAdapter = new DataAdapter<ComponentRow, Component>();

export function isComponentRow(row: object): row is ComponentRow {
  return hasProperties(
    row,
    'id',
    'parent_id',
    'created_at'
  );
}
