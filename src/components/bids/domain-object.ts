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
  acceptedAt: Date | null;
  createdAt: Date;
  createdBy: string;
  quoteId: string;
  bidPriceCents: number;
  projectDueInMs: number | null;
  description?: string;
}

export interface BidCreationPayload extends Bid {
  acceptedAt: null;
  taskTypeIds: string[];
}

export interface BidRow {
  id: string;
  accepted_at: string | null;
  created_at: string;
  created_by: string;
  quote_id: string;
  bid_price_cents: number;
  project_due_in_ms: string | null;
  description?: string;
}

export const encode = (row: BidRow): Bid => ({
  id: row.id,
  acceptedAt: row.accepted_at ? new Date(row.accepted_at) : null,
  createdAt: new Date(row.created_at),
  createdBy: row.created_by,
  quoteId: row.quote_id,
  bidPriceCents: row.bid_price_cents,
  projectDueInMs:
    row.project_due_in_ms !== null ? Number(row.project_due_in_ms) : null,
  description: row.description
});

export const decode = (data: Bid): BidRow => ({
  id: data.id,
  accepted_at: data.acceptedAt ? data.acceptedAt.toISOString() : null,
  created_at: data.createdAt.toISOString(),
  created_by: data.createdBy,
  quote_id: data.quoteId,
  bid_price_cents: data.bidPriceCents,
  project_due_in_ms: data.projectDueInMs
    ? data.projectDueInMs.toString()
    : null,
  description: data.description
});

export const dataAdapter = new DataAdapter<BidRow, Bid>(encode, decode);

export function isBid(row: object): row is Bid {
  return hasProperties(
    row,
    'id',
    'acceptedAt',
    'createdAt',
    'createdBy',
    'quoteId',
    'bidPriceCents',
    'projectDueInMs',
    'description'
  );
}

export function isBidRow(row: object): row is BidRow {
  return hasProperties(
    row,
    'id',
    'accepted_at',
    'created_at',
    'created_by',
    'quote_id',
    'bid_price_cents',
    'project_due_in_ms',
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
    designEvents: design_events
      ? design_events.map(
          (event: DesignEventRow): DesignEvent => {
            return {
              ...eventDataAdapter.parse.apply(eventDataAdapter, [event]),
              createdAt: new Date(event.created_at)
            };
          }
        )
      : []
  };
}

export const bidWithEventsDataAdapter = new DataAdapter<
  BidWithEventsRow,
  BidWithEvents
>(withEventEncode);

export function isBidWithEventsRow(row: object): row is BidWithEventsRow {
  return isBidRow(row) && hasProperties(row, 'design_events');
}
