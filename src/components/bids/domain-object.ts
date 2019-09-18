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
  completedAt: Date | null;
  dueDate: Date | null;
  quoteId: string;
  bidPriceCents: number;
  description?: string;
}

export type BidCreationPayload = Bid & {
  acceptedAt: null;
  dueDate: Date;
  taskTypeIds: string[];
};

export interface BidRow {
  id: string;
  accepted_at: string | null;
  created_at: string;
  created_by: string;
  completed_at: string | null;
  due_date: string | null;
  quote_id: string;
  bid_price_cents: number;
  description?: string;
}

export const encode = (row: BidRow): Bid => ({
  id: row.id,
  acceptedAt: row.accepted_at ? new Date(row.accepted_at) : null,
  createdAt: new Date(row.created_at),
  createdBy: row.created_by,
  completedAt: row.completed_at ? new Date(row.completed_at) : null,
  dueDate: row.due_date ? new Date(row.due_date) : null,
  quoteId: row.quote_id,
  bidPriceCents: row.bid_price_cents,
  description: row.description
});

export const decode = (data: Bid): BidRow => ({
  id: data.id,
  accepted_at: data.acceptedAt ? data.acceptedAt.toISOString() : null,
  created_at: data.createdAt.toISOString(),
  created_by: data.createdBy,
  completed_at: data.completedAt ? data.completedAt.toISOString() : null,
  due_date: data.dueDate ? data.dueDate.toISOString() : null,
  quote_id: data.quoteId,
  bid_price_cents: data.bidPriceCents,
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
    'completedAt',
    'dueDate',
    'quoteId',
    'bidPriceCents',
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
    'completed_at',
    'due_date',
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

export type BidSortByParam = 'ACCEPTED' | 'DUE';

export function isBidSortByParam(
  candidate: string | undefined
): candidate is BidSortByParam {
  return candidate === 'ACCEPTED' || candidate === 'DUE';
}
