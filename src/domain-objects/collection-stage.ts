import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

/**
 * @typedef {object} Task A unit of work to be completed in the developement of a garment
 *
 * @property {string} id Primary id
 * @property {string} collectionId The id of the collection that this stage applies to
 * @property {Date} createdAt Date when this record was created
 * @property {string} title The title of the stage
 */

export interface CollectionStageRequest {
  collectionId: string;
  title: string;
}

export default interface CollectionStage extends CollectionStageRequest {
  createdAt: Date;
  id: string;
}

export interface CollectionStageRow {
  id: string;
  collection_id: string;
  created_at: Date;
  title: string;
}

export const dataAdapter = new DataAdapter<CollectionStageRow, CollectionStage>();

export function isCollectionStageRequest(candidate: object): candidate is CollectionStageRequest {
  return hasProperties(
    candidate,
    'collectionId',
    'title'
  );
}

export function isCollectionStageRow(row: object): row is CollectionStageRow {
  return hasProperties(
    row,
    'id',
    'collection_id',
    'created_at',
    'title'
  );
}
