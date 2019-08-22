import DataAdapter from '../../../services/data-adapter';
import { hasProperties } from '@cala/ts-lib';

export default interface DimensionAttribute {
  createdAt: Date;
  createdBy: string;
  deletedAt: Date | null;
  id: string;
  height: number;
  nodeId: string;
  width: number;
}

export interface DimensionAttributeRow {
  created_at: string;
  created_by: string;
  deleted_at: string | null;
  id: string;
  height: string;
  node_id: string;
  width: string;
}

export function encode(row: DimensionAttributeRow): DimensionAttribute {
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

export function decode(data: DimensionAttribute): DimensionAttributeRow {
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

export const dataAdapter = new DataAdapter<
  DimensionAttributeRow,
  DimensionAttribute
>(encode, decode);

export function isDimensionAttribute(obj: object): obj is DimensionAttribute {
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

export function isDimensionAttributeRow(
  row: object
): row is DimensionAttributeRow {
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
