import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

interface CollectionSubmissionStatus {
  collectionId: string;
  isSubmitted: boolean;
  isCosted: boolean;
  isQuoted: boolean;
  isPaired: boolean;
}

interface CollectionSubmissionStatusRow {
  collection_id: string;
  is_submitted: boolean;
  is_costed: boolean;
  is_quoted: boolean;
  is_paired: boolean;
}

export const dataAdapter = new DataAdapter<
  CollectionSubmissionStatusRow,
  CollectionSubmissionStatus
>();

export function isCollectionSubmissionStatus(
  candidate: object
): candidate is CollectionSubmissionStatus {
  return hasProperties(
    candidate,
    'collectionId',
    'isSubmitted',
    'isCosted',
    'isQuoted',
    'isPaired'
  );
}

export function isCollectionSubmissionStatusRow(
  candidate: object
): candidate is CollectionSubmissionStatusRow {
  return hasProperties(
    candidate,
    'collection_id',
    'is_submitted',
    'is_costed',
    'is_quoted',
    'is_paired'
  );
}
