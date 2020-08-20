import { Serialized } from "../../types/serialized";
import { ShipmentTracking } from "./types";
import {
  RealtimeMessage,
  isRealtimeMessage,
  RealtimeMessageType,
} from "../iris/types";
import { buildChannelName } from "../iris/build-channel";

export interface RealtimeShipmentTrackingUpdated extends RealtimeMessage {
  resource: ShipmentTracking;
  type: RealtimeMessageType.shipmentTrackingUpdated;
}

export function isRealtimeShipmentTrackingUpdated(
  data: any
): data is Serialized<RealtimeShipmentTrackingUpdated> {
  return (
    isRealtimeMessage(data) &&
    data.type === RealtimeMessageType.shipmentTrackingUpdated
  );
}

export function realtimeShipmentTrackingUpdated(
  shipmentTracking: ShipmentTracking
): RealtimeShipmentTrackingUpdated {
  return {
    type: RealtimeMessageType.shipmentTrackingUpdated,
    resource: shipmentTracking,
    channels: [
      buildChannelName("approval-steps", shipmentTracking.approvalStepId),
    ],
  };
}

export interface RealtimeShipmentTrackingCreated extends RealtimeMessage {
  resource: ShipmentTracking;
  type: RealtimeMessageType.shipmentTrackingCreated;
}

export function isRealtimeShipmentTrackingCreated(
  data: any
): data is Serialized<RealtimeShipmentTrackingCreated> {
  return (
    isRealtimeMessage(data) &&
    data.type === RealtimeMessageType.shipmentTrackingCreated
  );
}

export function realtimeShipmentTrackingCreated(
  shipmentTracking: ShipmentTracking
): RealtimeShipmentTrackingCreated {
  return {
    type: RealtimeMessageType.shipmentTrackingCreated,
    resource: shipmentTracking,
    channels: [
      buildChannelName("approval-steps", shipmentTracking.approvalStepId),
    ],
  };
}
