import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

export const UPDATABLE_PROPERTIES = ['collection_id', 'design_id'];

export default interface CollectionDesign {
  collectionId: string;
  createdAt: Date;
  designId: string;
}

export interface CollectionDesignRow {
  collection_id: string;
  created_at: Date;
  design_id: string;
}

export const dataAdapter = new DataAdapter<
  CollectionDesignRow,
  CollectionDesign
>();

export function isCollectionDesignRow(row: object): row is CollectionDesignRow {
  return hasProperties(row, 'collection_id', 'created_at', 'design_id');
}
