import { z } from "zod";
import { realtimeNotificationCreatedSchema } from "../notifications/realtime";
import {
  realtimeShipmentTrackingCreatedSchema,
  realtimeShipmentTrackingUpdatedSchema,
} from "../shipment-trackings/realtime";
import {
  realtimeSubmissionCommentCreatedSchema,
  realtimeSubmissionCommentDeletedSchema,
} from "../submission-comments/realtime";
import {
  realtimeTeamListUpdatedSchema,
  realtimeTeamUsersListUpdatedSchema,
} from "../team-users/realtime";

// Generic catch-all to allow expanding types without throwing
export const unknownRealtimeMessageSchema = z.object({
  type: z.string(),
  channels: z.array(z.string()),
  resource: z.unknown(),
});

export const realtimeMessageSchema = z.union([
  realtimeShipmentTrackingCreatedSchema,
  realtimeShipmentTrackingUpdatedSchema,
  realtimeNotificationCreatedSchema,
  realtimeTeamUsersListUpdatedSchema,
  realtimeTeamListUpdatedSchema,
  realtimeSubmissionCommentCreatedSchema,
  realtimeSubmissionCommentDeletedSchema,
]);

export type RealtimeMessage = z.infer<typeof realtimeMessageSchema>;
