import { z } from "zod";
import ApprovalStepSubmission, {
  serializedApprovalStepSubmissionSchema,
} from "./types";
import {
  DesignEventWithMeta,
  serializedDesignEventWithMetaSchema,
} from "../design-events/types";
import {
  CommentWithResources,
  serializedCommentSchema,
} from "../comments/types";
import { buildChannelName } from "../iris/build-channel";

export const realtimeApprovalSubmissionUpdatedSchema = z.object({
  resource: serializedApprovalStepSubmissionSchema,
  channels: z.array(z.string()),
  type: z.literal("approval-step-submission/updated"),
});

export type RealtimeApprovalSubmissionUpdated = z.infer<
  typeof realtimeApprovalSubmissionUpdatedSchema
>;

export function realtimeApprovalSubmissionUpdated(
  submission: ApprovalStepSubmission
): RealtimeApprovalSubmissionUpdated {
  return {
    type: "approval-step-submission/updated",
    resource: submission,
    channels: [
      buildChannelName("approval-steps", submission.stepId),
      buildChannelName("submissions", submission.id),
    ],
  };
}

export const realtimeApprovalSubmissionCreatedSchema = z.object({
  resource: serializedApprovalStepSubmissionSchema,
  channels: z.array(z.string()),
  type: z.literal("approval-step-submission/created"),
});

export type RealtimeApprovalSubmissionCreated = z.infer<
  typeof realtimeApprovalSubmissionCreatedSchema
>;

export function realtimeApprovalSubmissionCreated(
  submission: ApprovalStepSubmission
): RealtimeApprovalSubmissionCreated {
  return {
    type: "approval-step-submission/created",
    resource: submission,
    channels: [
      buildChannelName("approval-steps", submission.stepId),
      buildChannelName("submissions", submission.id),
    ],
  };
}

export const realtimeApprovalSubmissionDeletedSchema = z.object({
  resource: serializedApprovalStepSubmissionSchema,
  channels: z.array(z.string()),
  type: z.literal("approval-step-submission/deleted"),
});

export type RealtimeApprovalSubmissionDeleted = z.infer<
  typeof realtimeApprovalSubmissionDeletedSchema
>;

export function realtimeApprovalSubmissionDeleted(
  submission: ApprovalStepSubmission
): RealtimeApprovalSubmissionDeleted {
  return {
    type: "approval-step-submission/deleted",
    resource: submission,
    channels: [
      buildChannelName("approval-steps", submission.stepId),
      buildChannelName("submissions", submission.id),
    ],
  };
}

export const realtimeApprovalSubmissionRevisionRequestSchema = z.object({
  resource: z.object({
    event: serializedDesignEventWithMetaSchema,
    comment: serializedCommentSchema,
  }),
  channels: z.array(z.string()),
  type: z.literal("approval-step-submission/revision-request"),
});

export type RealtimeApprovalSubmissionRevisionRequest = z.infer<
  typeof realtimeApprovalSubmissionRevisionRequestSchema
>;

export function realtimeApprovalSubmissionRevisionRequest({
  event,
  comment,
}: {
  event: DesignEventWithMeta;
  comment: CommentWithResources;
}): RealtimeApprovalSubmissionRevisionRequest {
  if (event.approvalStepId === null || event.approvalSubmissionId === null) {
    throw new Error(
      "Revision Request realtime is missing submission and step ID"
    );
  }

  return {
    type: "approval-step-submission/revision-request",
    resource: { event, comment },
    channels: [
      buildChannelName("approval-steps", event.approvalStepId),
      buildChannelName("submissions", event.approvalSubmissionId),
    ],
  };
}
