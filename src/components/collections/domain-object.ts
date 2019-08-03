import DataAdapter from '../../services/data-adapter';
import {
  hasOnlyProperties,
  hasProperties,
  hasSomeProperties
} from '../../services/require-properties';

export const UPDATABLE_PROPERTIES = ['description', 'title'];

export const INSERTABLE_PROPERTIES = [
  'created_by',
  'description',
  'id',
  'title'
];

export default interface Collection {
  createdAt: Date;
  createdBy: string;
  deletedAt: Date | null;
  description: string | null;
  id: string;
  title: string | null;
}

export interface CollectionRow {
  created_at: Date;
  created_by: string;
  deleted_at: Date | null;
  description: string | null;
  id: string;
  title: string | null;
}

export const dataAdapter = new DataAdapter<CollectionRow, Collection>();
export const partialDataAdapter = new DataAdapter<
  Partial<CollectionRow>,
  Partial<Collection>
>();

export function isCollectionRow(row: object): row is CollectionRow {
  return hasProperties(
    row,
    'created_at',
    'created_by',
    'deleted_at',
    'description',
    'id',
    'title'
  );
}

export function isCollection(candidate: object): candidate is Collection {
  return hasOnlyProperties(
    candidate,
    'createdAt',
    'createdBy',
    'deletedAt',
    'description',
    'id',
    'title'
  );
}

export function isPartialCollection(
  candidate: object
): candidate is Partial<Collection> {
  return hasSomeProperties(
    candidate,
    'createdAt',
    'createdBy',
    'deletedAt',
    'description',
    'id',
    'title'
  );
}
