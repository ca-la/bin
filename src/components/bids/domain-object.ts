import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';

/**
 * A pricing bid for matching partners to a set of services on a design
 */

export default interface Bid {
  id: string;
  createdAt: Date;
  createdBy: string;
  quoteId: string;
  bidPriceCents: number;
  description?: string;
}

export interface BidRow {
  id: string;
  created_at: Date;
  created_by: string;
  quote_id: string;
  bid_price_cents: number;
  description?: string;
}

export const dataAdapter = new DataAdapter<BidRow, Bid>();

export function isBid(row: object): row is Bid {
  return hasProperties(
    row,
    'id',
    'createdAt',
    'createdBy',
    'quoteId',
    'bidPriceCents',
    'description'
  );
}

export function isBidRow(row: object): row is BidRow {
  return hasProperties(
    row,
    'id',
    'created_at',
    'created_by',
    'quote_id',
    'bid_price_cents',
    'description'
  );
}
