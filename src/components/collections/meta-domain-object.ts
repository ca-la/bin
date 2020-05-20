import DataAdapter from "../../services/data-adapter";
import { hasProperties } from "../../services/require-properties";

export interface MetaCollectionRow {
  id: string;
  created_by: string;
}

export interface MetaCollection {
  id: string;
  createdBy: string;
}

export const dataAdapter = new DataAdapter<MetaCollectionRow, MetaCollection>();

export function isMetaCollectionRow(row: object): row is MetaCollectionRow {
  return hasProperties(row, "id", "created_by");
}
