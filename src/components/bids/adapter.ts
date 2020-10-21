import { buildAdapter } from "../../services/cala-component/cala-adapter";
import eventDataAdapter from "../design-events/adapter";
import {
  Bid,
  BidDb,
  BidRow,
  BidDbRow,
  BidWithEventsRow,
  BidWithEvents,
} from "./types";
import { Serialized } from "../../types/serialized";
import DesignEvent, { DesignEventRow } from "../design-events/types";

function encodeRaw(row: BidDbRow): BidDb {
  return {
    bidPriceCents: row.bid_price_cents,
    bidPriceProductionOnlyCents: row.bid_price_production_only_cents,
    createdAt: row.created_at,
    createdBy: row.created_by,
    description: row.description,
    dueDate: row.due_date,
    id: row.id,
    quoteId: row.quote_id,
    revenueShareBasisPoints: row.revenue_share_basis_points,
  };
}

function decodeRaw(data: BidDb): BidDbRow {
  return {
    bid_price_cents: data.bidPriceCents,
    bid_price_production_only_cents: data.bidPriceProductionOnlyCents,
    created_at: data.createdAt,
    created_by: data.createdBy,
    description: data.description,
    due_date: data.dueDate,
    id: data.id,
    quote_id: data.quoteId,
    revenue_share_basis_points: data.revenueShareBasisPoints,
  };
}

export const rawAdapter = buildAdapter<BidDb, BidDbRow>({
  domain: "Bid",
  requiredProperties: [
    "bidPriceCents",
    "bidPriceProductionOnlyCents",
    "createdAt",
    "createdBy",
    "description",
    "dueDate",
    "id",
    "quoteId",
    "revenueShareBasisPoints",
  ],
  encodeTransformer: encodeRaw,
  decodeTransformer: decodeRaw,
});

function encode(row: BidRow): Bid {
  return {
    ...encodeRaw(row),
    acceptedAt: row.accepted_at,
    assignee: row.assignee && {
      type: row.assignee.type,
      id: row.assignee.id,
      name: row.assignee.name,
    },
    partnerUserId:
      row.assignee && (row.assignee.type === "USER" ? row.assignee.id : null),
  };
}

function decode(data: Bid): BidRow {
  return {
    ...decodeRaw(data),
    accepted_at: data.acceptedAt,
    assignee: data.assignee && {
      type: data.assignee.type,
      id: data.assignee.id,
      name: data.assignee.name,
    },
    partner_user_id:
      data.assignee &&
      (data.assignee.type === "USER" ? data.assignee.id : null),
  };
}

export const dataAdapter = buildAdapter<Bid, BidRow>({
  domain: "Bid",
  requiredProperties: [
    "acceptedAt",
    "bidPriceCents",
    "bidPriceProductionOnlyCents",
    "createdAt",
    "createdBy",
    "description",
    "dueDate",
    "id",
    "quoteId",
    "revenueShareBasisPoints",
    "assignee",
  ],
  encodeTransformer: encode,
  decodeTransformer: decode,
});

function withEventsEncode(row: BidWithEventsRow): BidWithEvents {
  return {
    ...encode(row),
    designEvents: row.design_events.map(
      (serialized: Serialized<DesignEventRow>): DesignEvent => {
        const { created_at, ...event } = serialized;
        return eventDataAdapter.fromDb({
          ...event,
          created_at: new Date(created_at),
        });
      }
    ),
  };
}

function withEventsDecode(data: BidWithEvents): BidWithEventsRow {
  return {
    ...decode(data),
    design_events: data.designEvents.map(
      (designEvent: DesignEvent): Serialized<DesignEventRow> => {
        return {
          ...eventDataAdapter.toDb(designEvent),
          created_at: designEvent.createdAt.toISOString(),
        };
      }
    ),
  };
}

export const withEventsDataAdapter = buildAdapter<
  BidWithEvents,
  BidWithEventsRow
>({
  domain: "Bid",
  requiredProperties: [
    "acceptedAt",
    "bidPriceCents",
    "bidPriceProductionOnlyCents",
    "createdAt",
    "createdBy",
    "description",
    "dueDate",
    "id",
    "quoteId",
    "revenueShareBasisPoints",
    "assignee",
  ],
  encodeTransformer: withEventsEncode,
  decodeTransformer: withEventsDecode,
});
