import DataAdapter from "../../services/data-adapter";
import {
  hasOnlyProperties,
  hasProperties,
  hasSomeProperties,
} from "../../services/require-properties";
import { Collection, CollectionRow as Row } from "./types";

export default Collection;
export type CollectionRow = Row;

export const UPDATABLE_PROPERTIES = ["description", "title"];

export const INSERTABLE_PROPERTIES = [
  "created_by",
  "description",
  "id",
  "title",
];

function encode(row: CollectionRow): Collection {
  return {
    createdAt: row.created_at,
    createdBy: row.created_by,
    deletedAt: row.deleted_at,
    description: row.description,
    id: row.id,
    title: row.title,
  };
}

function decode(data: Collection): CollectionRow {
  return {
    created_at: data.createdAt,
    created_by: data.createdBy,
    deleted_at: data.deletedAt,
    description: data.description,
    id: data.id,
    title: data.title,
  };
}

export const dataAdapter = new DataAdapter<CollectionRow, Collection>(
  encode,
  decode
);
export const partialDataAdapter = new DataAdapter<
  Partial<CollectionRow>,
  Partial<Collection>
>();

export function isCollectionRow(row: object): row is CollectionRow {
  return hasProperties(
    row,
    "created_at",
    "created_by",
    "deleted_at",
    "description",
    "id",
    "title"
  );
}

export function isCollection(candidate: object): candidate is Collection {
  return hasOnlyProperties(
    candidate,
    "createdAt",
    "createdBy",
    "deletedAt",
    "description",
    "id",
    "title"
  );
}

export function isPartialCollection(
  candidate: object
): candidate is Partial<Collection> {
  return hasSomeProperties(
    candidate,
    "createdAt",
    "createdBy",
    "deletedAt",
    "description",
    "id",
    "title"
  );
}
