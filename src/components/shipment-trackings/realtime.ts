import { z } from "zod";
import {
  ShipmentTracking,
  DeliveryStatus,
  serializedShipmentTrackingSchema,
  serializedDeliveryStatusSchema,
} from "./types";
import { buildChannelName } from "../iris/build-channel";

const baseRealtimeShipmentTrackingSchema = z.object({
  resource: z.intersection(
    serializedShipmentTrackingSchema,
    z.object({
      deliveryStatus: serializedDeliveryStatusSchema,
      trackingLink: z.string(),
    })
  ),
  channels: z.tuple([z.string()]),
});

export const realtimeShipmentTrackingUpdatedSchema = baseRealtimeShipmentTrackingSchema.extend(
  {
    type: z.literal("shipment-tracking/updated"),
  }
);

export type RealtimeShipmentTrackingUpdated = z.infer<
  typeof realtimeShipmentTrackingUpdatedSchema
>;

export function realtimeShipmentTrackingUpdated(
  shipmentTracking: ShipmentTracking & {
    deliveryStatus: DeliveryStatus;
    trackingLink: string;
  }
): RealtimeShipmentTrackingUpdated {
  return {
    type: "shipment-tracking/updated",
    resource: shipmentTracking,
    channels: [
      buildChannelName("approval-steps", shipmentTracking.approvalStepId),
    ],
  };
}

export const realtimeShipmentTrackingCreatedSchema = baseRealtimeShipmentTrackingSchema.extend(
  {
    type: z.literal("shipment-tracking/created"),
  }
);

export type RealtimeShipmentTrackingCreated = z.infer<
  typeof realtimeShipmentTrackingCreatedSchema
>;

export function realtimeShipmentTrackingCreated(
  shipmentTracking: ShipmentTracking & {
    deliveryStatus: DeliveryStatus;
    trackingLink: string;
  }
): RealtimeShipmentTrackingCreated {
  return {
    type: "shipment-tracking/created",
    resource: shipmentTracking,
    channels: [
      buildChannelName("approval-steps", shipmentTracking.approvalStepId),
    ],
  };
}
