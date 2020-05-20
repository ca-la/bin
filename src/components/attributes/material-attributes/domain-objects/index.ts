import DataAdapter from "../../../../services/data-adapter";
import { hasProperties } from "@cala/ts-lib";

export default interface MaterialAttribute {
  createdAt: Date;
  createdBy: string;
  deletedAt: Date | null;
  id: string;
  nodeId: string;
  assetId: string;
  width: number;
  height: number;
}

export interface MaterialAttributeRow {
  created_at: string;
  created_by: string;
  deleted_at: string | null;
  id: string;
  node_id: string;
  asset_id: string;
  width: string;
  height: string;
}

export function encode(row: MaterialAttributeRow): MaterialAttribute {
  return {
    assetId: row.asset_id,
    createdAt: new Date(row.created_at),
    createdBy: row.created_by,
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    id: row.id,
    height: Number(row.height),
    nodeId: row.node_id,
    width: Number(row.width),
  };
}

export function decode(data: MaterialAttribute): MaterialAttributeRow {
  return {
    asset_id: data.assetId,
    created_at: data.createdAt.toISOString(),
    created_by: data.createdBy,
    deleted_at: data.deletedAt ? data.deletedAt.toISOString() : null,
    id: data.id,
    height: String(data.height),
    node_id: data.nodeId,
    width: String(data.width),
  };
}

export const dataAdapter = new DataAdapter<
  MaterialAttributeRow,
  MaterialAttribute
>(encode, decode);

export function isMaterialAttribute(obj: object): obj is MaterialAttribute {
  return hasProperties(
    obj,
    "assetId",
    "createdAt",
    "createdBy",
    "deletedAt",
    "id",
    "height",
    "nodeId",
    "width"
  );
}

export function isMaterialAttributeRow(
  row: object
): row is MaterialAttributeRow {
  return hasProperties(
    row,
    "asset_id",
    "created_at",
    "created_by",
    "deleted_at",
    "id",
    "height",
    "node_id",
    "width"
  );
}
