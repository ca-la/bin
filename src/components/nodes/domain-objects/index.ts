import { NodeType } from '@cala/ts-lib/dist/phidias';
import { hasProperties } from '@cala/ts-lib';
import DataAdapter from '../../../services/data-adapter';

export default interface Node {
  id: string;
  createdAt: Date;
  createdBy: string;
  deletedAt: Date | null;
  parentId: string | null;
  x: number;
  y: number;
  ordering: number;
  title: string | null;
  type: NodeType | null;
}

export interface NodeRow {
  id: string;
  created_at: string;
  created_by: string;
  deleted_at: string | null;
  parent_id: string | null;
  x: string;
  y: string;
  ordering: number;
  title: string | null;
  type: NodeType | null;
}

function encode(row: NodeRow): Node {
  return {
    id: row.id,
    createdAt: new Date(row.created_at),
    createdBy: row.created_by,
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    parentId: row.parent_id,
    x: Number(row.x),
    y: Number(row.y),
    ordering: row.ordering,
    title: row.title,
    type: row.type
  };
}

function decode(data: Node): NodeRow {
  return {
    id: data.id,
    created_at: data.createdAt.toISOString(),
    created_by: data.createdBy,
    deleted_at: data.deletedAt ? data.deletedAt.toISOString() : null,
    parent_id: data.parentId,
    x: String(data.x),
    y: String(data.y),
    ordering: data.ordering,
    title: data.title,
    type: data.type
  };
}

export const dataAdapter = new DataAdapter<NodeRow, Node>(encode, decode);

export function isNode(obj: object): obj is Node {
  return hasProperties(
    obj,
    'id',
    'createdAt',
    'createdBy',
    'deletedAt',
    'parentId',
    'x',
    'y',
    'ordering',
    'title',
    'type'
  );
}

export function isNodeRow(row: object): row is NodeRow {
  return hasProperties(
    row,
    'id',
    'created_at',
    'created_by',
    'deleted_at',
    'parent_id',
    'x',
    'y',
    'ordering',
    'title',
    'type'
  );
}
