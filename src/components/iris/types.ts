import { z } from "zod";
import { check } from "../../services/check";
import { Serialized } from "../../types/serialized";

export enum RealtimeMessageType {
  shipmentTrackingUpdated = "shipment-tracking/updated",
  shipmentTrackingCreated = "shipment-tracking/created",
  notificationCreated = "notification/created",
  teamUsersListUpdated = "team-users-list/updated",
  teamListUpdated = "team-list/updated",
  submissionCommentDeleted = "submission-comment/deleted",
  submissionCommentCreated = "submission-comment/created",
}

export const realtimeMessageSchema = z.object({
  // string here to avoid breaking backwards compatibility when adding new messages
  type: z.string(),
  channels: z.array(z.string()),
  resource: z.any(),
});
export type RealtimeMessage = z.infer<typeof realtimeMessageSchema>;

export function isRealtimeMessage(
  data: any
): data is Serialized<RealtimeMessage> {
  return check(realtimeMessageSchema, data);
}
