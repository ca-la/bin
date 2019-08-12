import DataAdapter from '../../../../services/data-adapter';
import { hasProperties } from '@cala/ts-lib';

export default interface ArtworkAttribute {
  assetId: string;
  createdAt: Date;
  createdBy: string;
  deletedAt: Date | null;
  id: string;
  height: number;
  nodeId: string;
  width: number;
  x: number;
  y: number;
}

export interface ArtworkAttributeRow {
  asset_id: string;
  created_at: string;
  created_by: string;
  deleted_at: string | null;
  id: string;
  height: string;
  node_id: string;
  width: string;
  x: string;
  y: string;
}

export function encode(row: ArtworkAttributeRow): ArtworkAttribute {
  return {
    assetId: row.asset_id,
    createdAt: new Date(row.created_at),
    createdBy: row.created_by,
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    id: row.id,
    height: Number(row.height),
    nodeId: row.node_id,
    width: Number(row.width),
    x: Number(row.x),
    y: Number(row.y)
  };
}

export function decode(data: ArtworkAttribute): ArtworkAttributeRow {
  return {
    asset_id: data.assetId,
    created_at: data.createdAt.toISOString(),
    created_by: data.createdBy,
    deleted_at: data.deletedAt ? data.deletedAt.toISOString() : null,
    id: data.id,
    height: String(data.height),
    node_id: data.nodeId,
    width: String(data.width),
    x: String(data.x),
    y: String(data.y)
  };
}

export const dataAdapter = new DataAdapter<
  ArtworkAttributeRow,
  ArtworkAttribute
>(encode, decode);

export function isArtworkAttribute(obj: object): obj is ArtworkAttribute {
  return hasProperties(
    obj,
    'assetId',
    'createdAt',
    'createdBy',
    'deletedAt',
    'id',
    'height',
    'nodeId',
    'width',
    'x',
    'y'
  );
}

export function isArtworkAttributeRow(row: object): row is ArtworkAttributeRow {
  return hasProperties(
    row,
    'asset_id',
    'created_at',
    'created_by',
    'deleted_at',
    'id',
    'height',
    'node_id',
    'width',
    'x',
    'y'
  );
}
