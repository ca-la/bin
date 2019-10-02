import { hasProperties } from '@cala/ts-lib';
import { PhidiasLayout as LayoutAttribute } from '@cala/ts-lib/dist/phidias';

import DataAdapter from '../../../services/data-adapter';

export default LayoutAttribute;

export interface LayoutAttributeRow {
  created_at: string;
  created_by: string;
  deleted_at: string | null;
  id: string;
  height: string;
  node_id: string;
  width: string;
}

export function encode(row: LayoutAttributeRow): LayoutAttribute {
  return {
    createdAt: new Date(row.created_at),
    createdBy: row.created_by,
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    id: row.id,
    height: Number(row.height),
    nodeId: row.node_id,
    width: Number(row.width)
  };
}

export function decode(data: LayoutAttribute): LayoutAttributeRow {
  return {
    created_at: data.createdAt.toISOString(),
    created_by: data.createdBy,
    deleted_at: data.deletedAt ? data.deletedAt.toISOString() : null,
    id: data.id,
    height: String(data.height),
    node_id: data.nodeId,
    width: String(data.width)
  };
}

export const dataAdapter = new DataAdapter<LayoutAttributeRow, LayoutAttribute>(
  encode,
  decode
);

export function isLayoutAttribute(obj: object): obj is LayoutAttribute {
  return hasProperties(
    obj,
    'createdAt',
    'createdBy',
    'deletedAt',
    'id',
    'height',
    'nodeId',
    'width'
  );
}

export function isLayoutAttributeRow(row: object): row is LayoutAttributeRow {
  return hasProperties(
    row,
    'created_at',
    'created_by',
    'deleted_at',
    'id',
    'height',
    'node_id',
    'width'
  );
}
