import { z } from "zod";
import {
  dateStringToDate,
  nullableDateStringToNullableDate,
} from "../../services/zod-helpers";

export const shipmentTrackingSchema = z.object({
  id: z.string(),
  courier: z.string(),
  trackingId: z.string(),
  description: z.string().nullable(),
  approvalStepId: z.string(),
  createdAt: z.date(),
  expectedDelivery: z.date().nullable(),
  deliveryDate: z.date().nullable(),
});

export type ShipmentTracking = z.infer<typeof shipmentTrackingSchema>;

export const serializedShipmentTrackingSchema = shipmentTrackingSchema.extend({
  createdAt: dateStringToDate,
  expectedDelivery: nullableDateStringToNullableDate,
  deliveryDate: nullableDateStringToNullableDate,
});

export interface ShipmentTrackingRow {
  id: string;
  courier: string;
  tracking_id: string;
  description: string | null;
  approval_step_id: string;
  created_at: Date;
  expected_delivery: Date | null;
  delivery_date: Date | null;
}

export const domain = "ShipmentTracking" as "ShipmentTracking";

export function isShipmentTrackingRow(
  candidate: object
): candidate is ShipmentTrackingRow {
  const keyset = new Set(Object.keys(candidate));
  return [
    "id",
    "courier",
    "tracking_id",
    "description",
    "approval_step_id",
    "created_at",
    "expected_delivery",
    "delivery_date",
  ].every((key: string) => keyset.has(key));
}

export const deliveryStatusSchema = z.object({
  tag: z.string(),
  expectedDelivery: z.date().nullable(),
  deliveryDate: z.date().nullable(),
});

export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>;

export const serializedDeliveryStatusSchema = deliveryStatusSchema.extend({
  expectedDelivery: nullableDateStringToNullableDate,
  deliveryDate: nullableDateStringToNullableDate,
});
