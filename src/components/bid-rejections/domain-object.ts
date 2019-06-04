import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';

export interface BidRejection {
  id: string;
  createdAt: Date;
  createdBy: string;
  bidId: string;
  priceTooLow: boolean;
  deadlineTooShort: boolean;
  missingInformation: boolean;
  other: boolean;
  notes: string | null;
}

export interface BidRejectionRow {
  id: string;
  created_at: string;
  created_by: string;
  bid_id: string;
  price_too_low: string;
  deadline_too_short: string;
  missing_information: string;
  other: string;
  notes: string | null;
}

export const dataAdapter = new DataAdapter<BidRejectionRow, BidRejection>();

export function isBidRejectionRow(row: object): row is BidRejectionRow {
  return hasProperties(
    row,
    'id',
    'created_at',
    'created_by',
    'bid_id',
    'price_too_low',
    'deadline_too_short',
    'missing_information',
    'other',
    'notes'
  );
}

export function isBidRejection(data: object): data is BidRejection {
  return hasProperties(
    data,
    'id',
    'createdAt',
    'createdBy',
    'bidId',
    'priceTooLow',
    'deadlineTooShort',
    'missingInformation',
    'other',
    'notes'
  );
}
