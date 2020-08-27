import { ShipmentTrackingTag } from "../integrations/aftership/types";

export interface ShipmentTrackingEvent {
  id: string;
  shipmentTrackingId: string;
  createdAt: Date;
  courier: string;
  tag: ShipmentTrackingTag;
  subtag: string;
  location: string | null;
  country: string | null;
  message: string | null;
  courierTimestamp: Date;
  courierTag: string | null;
}

export interface ShipmentTrackingEventRow {
  id: string;
  shipment_tracking_id: string;
  created_at: Date;
  courier: string;
  tag: ShipmentTrackingTag;
  subtag: string;
  location: string | null;
  country: string | null;
  message: string | null;
  courier_timestamp: Date;
  courier_tag: string | null;
}

export const domain = "ShipmentTrackingEvent" as "ShipmentTrackingEvent";

export function isShipmentTrackingEventRow(
  candidate: Record<string, any>
): candidate is ShipmentTrackingEventRow {
  const keyset = new Set(Object.keys(candidate));
  return [
    "id",
    "shipment_tracking_id",
    "created_at",
    "courier",
    "tag",
    "subtag",
    "location",
    "country",
    "message",
    "courier_timestamp",
    "courier_tag",
  ].every((key: string) => keyset.has(key));
}
