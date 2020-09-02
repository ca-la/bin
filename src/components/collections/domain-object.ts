import DataAdapter from "../../services/data-adapter";
import {
  hasOnlyProperties,
  hasProperties,
  hasSomeProperties,
} from "../../services/require-properties";
import { CollectionDb, CollectionDbRow as Row } from "./types";

export default CollectionDb;
export type CollectionRow = Row;

export const UPDATABLE_PROPERTIES: (keyof CollectionRow)[] = [
  "description",
  "title",
];

export const INSERTABLE_PROPERTIES: (keyof CollectionRow)[] = [
  "created_by",
  "description",
  "id",
  "team_id",
  "title",
];

function encode(row: CollectionRow): CollectionDb {
  return {
    createdAt: row.created_at,
    createdBy: row.created_by,
    deletedAt: row.deleted_at,
    description: row.description,
    id: row.id,
    teamId: row.team_id,
    title: row.title,
  };
}

function decode(data: CollectionDb): CollectionRow {
  return {
    created_at: data.createdAt,
    created_by: data.createdBy,
    deleted_at: data.deletedAt,
    description: data.description,
    id: data.id,
    team_id: data.teamId,
    title: data.title,
  };
}

export const dataAdapter = new DataAdapter<CollectionRow, CollectionDb>(
  encode,
  decode
);
export const partialDataAdapter = new DataAdapter<
  Partial<CollectionRow>,
  Partial<CollectionDb>
>();

export function isCollectionRow(row: object): row is CollectionRow {
  return hasProperties(
    row,
    "created_at",
    "created_by",
    "deleted_at",
    "description",
    "id",
    "team_id",
    "title"
  );
}

export function isCollection(candidate: object): candidate is CollectionDb {
  return hasOnlyProperties(
    candidate,
    "createdAt",
    "createdBy",
    "deletedAt",
    "description",
    "id",
    "teamId",
    "title"
  );
}

export function isPartialCollection(
  candidate: object
): candidate is Partial<CollectionDb> {
  return hasSomeProperties(
    candidate,
    "createdAt",
    "createdBy",
    "deletedAt",
    "description",
    "id",
    "teamId",
    "title"
  );
}
