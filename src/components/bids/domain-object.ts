import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';
import DesignEvent, {
  dataAdapter as eventDataAdapter,
  DesignEventRow
} from '../../domain-objects/design-event';

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

export interface BidWithEventsRow extends BidRow {
  design_events: DesignEventRow[] | null;
}

export interface BidWithEvents extends Bid {
  designEvents: DesignEvent[];
}

function withEventEncode(row: BidWithEventsRow): BidWithEvents {
  const { design_events, ...bidRow } = row;

  return {
    ...dataAdapter.parse.apply(dataAdapter, [bidRow]),
    designEvents: design_events ? design_events.map((event: DesignEventRow): DesignEvent => {
      return {
        ...eventDataAdapter.parse.apply(eventDataAdapter, [event]),
        createdAt: new Date(event.created_at)
      };
    }) : []
  };
}

export const bidWithEventsDataAdapter = new DataAdapter<BidWithEventsRow, BidWithEvents>(
  withEventEncode
);

export function isBidWithEventsRow(row: object): row is BidWithEventsRow {
  return isBidRow(row) && hasProperties(
    row,
    'design_events'
  );
}
