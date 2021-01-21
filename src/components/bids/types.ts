import * as z from "zod";
import {
  designEventSchema,
  serializedDesignEventRowSchema,
} from "../design-events/types";
import { check } from "../../services/check";

export const bidAssigneeSchema = z.object({
  type: z.enum(["USER", "TEAM"]),
  id: z.string(),
  name: z.string(),
});
export type BidAssignee = z.infer<typeof bidAssigneeSchema>;

export const bidDbSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  createdBy: z.string(),
  dueDate: z.date().nullable(),
  quoteId: z.string(),
  bidPriceCents: z.number(),
  revenueShareBasisPoints: z.number(),
  bidPriceProductionOnlyCents: z.number(),
  description: z.string().nullable(),
});
export type BidDb = z.infer<typeof bidDbSchema>;

export const bidDbRowSchema = z.object({
  id: z.string(),
  created_at: z.date(),
  created_by: z.string(),
  due_date: z.date().nullable(),
  quote_id: z.string(),
  bid_price_cents: z.number(),
  revenue_share_basis_points: z.number(),
  bid_price_production_only_cents: z.number(),
  description: z.string().nullable(),
});
export type BidDbRow = z.infer<typeof bidDbRowSchema>;

export const bidSchema = bidDbSchema.extend({
  acceptedAt: z.date().nullable(),
  assignee: bidAssigneeSchema.nullable(),
});
export type Bid = z.infer<typeof bidSchema>;

export const bidRowSchema = bidDbRowSchema.extend({
  accepted_at: z.date().nullable(),
  assignee: bidAssigneeSchema.nullable(),
});
export type BidRow = z.infer<typeof bidRowSchema>;

export const bidWithEventsSchema = bidSchema.extend({
  designEvents: z.array(designEventSchema),
});
export type BidWithEvents = z.infer<typeof bidWithEventsSchema>;

export const bidWithEventsRowSchema = bidRowSchema.extend({
  design_events: z.array(serializedDesignEventRowSchema),
});
export type BidWithEventsRow = z.infer<typeof bidWithEventsRowSchema>;

export const bidSortByParamSchema = z.enum(["ACCEPTED", "DUE"]);
export type BidSortByParam = z.infer<typeof bidSortByParamSchema>;

export const isBidSortByParam = (
  candidate: unknown
): candidate is BidSortByParam => check(bidSortByParamSchema, candidate);

export const bidCreationPayloadSchema = z.object({
  quoteId: z.string(),
  description: z.string(),
  bidPriceCents: z.number(),
  dueDate: z.string(),
  projectDueInMs: z.number(),
  taskTypeIds: z.array(z.string()),
  revenueShareBasisPoints: z.number(),
  bidPriceProductionOnlyCents: z.number(),
  assignee: z.object({
    type: z.enum(["USER", "TEAM"]),
    id: z.string(),
  }),
});
export type BidCreationPayload = z.infer<typeof bidCreationPayloadSchema>;

export const isBidCreationPayload = (
  candidate: unknown
): candidate is BidCreationPayload =>
  check(bidCreationPayloadSchema, candidate);
