import { Serialized } from "../../types/serialized";

export enum RealtimeMessageType {
  shipmentTrackingUpdated = "shipment-tracking/updated",
  shipmentTrackingCreated = "shipment-tracking/created",
  notificationCreated = "notification/created",
  teamUsersListUpdated = "team-users-list/updated",
}

export interface RealtimeMessage {
  type: RealtimeMessageType;
  channels: string[];
  resource: any;
}

export function isRealtimeMessage(
  data: any
): data is Serialized<RealtimeMessage> {
  return "channels" in data && "type" in data && "resource" in data;
}
