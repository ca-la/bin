import { z } from "zod";
import {
  realtimeApprovalStepCommentCreatedSchema,
  realtimeApprovalStepCommentDeletedSchema,
} from "../approval-step-comments/realtime";
import {
  realtimeApprovalSubmissionCreatedSchema,
  realtimeApprovalSubmissionDeletedSchema,
  realtimeApprovalSubmissionRevisionRequestSchema,
  realtimeApprovalSubmissionUpdatedSchema,
} from "../approval-step-submissions/realtime";
import {
  realtimeApprovalStepUpdatedSchema,
  realtimeApprovalStepListUpdatedSchema,
} from "../approval-steps/realtime";
import { realtimeDesignEventCreatedSchema } from "../design-events/realtime";
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
import {
  realtimeCollectionStatusUpdatedSchema,
  realtimeCartDetailsCollectionUpdatedSchema,
} from "../collections/realtime";

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
  realtimeDesignEventCreatedSchema,
  realtimeApprovalSubmissionUpdatedSchema,
  realtimeApprovalSubmissionCreatedSchema,
  realtimeApprovalSubmissionDeletedSchema,
  realtimeApprovalSubmissionRevisionRequestSchema,
  realtimeApprovalStepCommentCreatedSchema,
  realtimeApprovalStepCommentDeletedSchema,
  realtimeApprovalStepUpdatedSchema,
  realtimeApprovalStepListUpdatedSchema,
  realtimeCollectionStatusUpdatedSchema,
  realtimeCartDetailsCollectionUpdatedSchema,
]);

export type RealtimeMessage = z.infer<typeof realtimeMessageSchema>;
