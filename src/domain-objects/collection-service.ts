import DataAdapter from '../services/data-adapter';
import {
  hasOnlyProperties,
  hasProperties
} from '../services/require-properties';

export default interface CollectionService {
  collectionId: string;
  createdAt: Date;
  createdBy: string;
  deletedAt: Date | null;
  id: string;
  needsDesignConsulting: boolean;
  needsFulfillment: boolean;
  needsPackaging: boolean;
}

export interface CollectionServiceRow {
  collection_id: string;
  created_at: Date;
  created_by: string;
  deleted_at: Date | null;
  id: string;
  needs_design_consulting: boolean;
  needs_fulfillment: boolean;
  needs_packaging: boolean;
}

export const UPDATABLE_PROPERTIES = [
  'collection_id',
  'needs_design_consulting',
  'needs_fulfillment',
  'needs_packaging'
];

export const dataAdapter = new DataAdapter<
  CollectionServiceRow,
  CollectionService
>();

export function isCollectionService(
  candidate: object
): candidate is CollectionService {
  return hasOnlyProperties(
    candidate,
    'collectionId',
    'createdAt',
    'createdBy',
    'deletedAt',
    'id',
    'needsDesignConsulting',
    'needsFulfillment',
    'needsPackaging'
  );
}

export function isCollectionServiceRow(
  row: object
): row is CollectionServiceRow {
  return hasProperties(
    row,
    'collection_id',
    'created_at',
    'created_by',
    'deleted_at',
    'id',
    'needs_design_consulting',
    'needs_fulfillment',
    'needs_packaging'
  );
}
