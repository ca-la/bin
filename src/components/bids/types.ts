import DesignEvent, { DesignEventRow } from "../design-events/types";
import { Serialized } from "../../types/serialized";

export interface BidAssignee {
  type: "USER" | "TEAM";
  id: string;
  name: string;
}

export interface BidDb {
  id: string;
  createdAt: Date;
  createdBy: string;
  dueDate: Date | null;
  quoteId: string;
  bidPriceCents: number;
  revenueShareBasisPoints: number;
  bidPriceProductionOnlyCents: number;
  description: string | null;
}

export interface BidDbRow {
  id: string;
  created_at: Date;
  created_by: string;
  due_date: Date | null;
  quote_id: string;
  bid_price_cents: number;
  revenue_share_basis_points: number;
  bid_price_production_only_cents: number;
  description: string | null;
}

export interface Bid extends BidDb {
  acceptedAt: Date | null;
  assignee: BidAssignee;
  partnerUserId: string | null;
}

export interface BidRow extends BidDbRow {
  accepted_at: Date | null;
  assignee: BidAssignee;
  partner_user_id: string | null;
}

export interface BidWithEvents extends Bid {
  designEvents: DesignEvent[];
}

export interface BidWithEventsRow extends BidRow {
  design_events: Serialized<DesignEventRow[]>;
}

export type BidSortByParam = "ACCEPTED" | "DUE";

export function isBidSortByParam(
  candidate: string | undefined
): candidate is BidSortByParam {
  return candidate === "ACCEPTED" || candidate === "DUE";
}

export interface BidCreationPayload {
  quoteId: string;
  description: string;
  bidPriceCents: number;
  dueDate: string;
  projectDueInMs: number;
  taskTypeIds: string[];
  revenueShareBasisPoints: number;
  bidPriceProductionOnlyCents: number;
  assignee: {
    type: "USER" | "TEAM";
    id: string;
  };
}

export function isBidCreationPayload(
  candidate: Record<string, any>
): candidate is BidCreationPayload {
  const keyset = new Set(Object.keys(candidate));

  return [
    "quoteId",
    "description",
    "bidPriceCents",
    "bidPriceProductionOnlyCents",
    "dueDate",
    "projectDueInMs",
    "taskTypeIds",
    "revenueShareBasisPoints",
    "assignee",
  ].every(keyset.has.bind(keyset));
}
