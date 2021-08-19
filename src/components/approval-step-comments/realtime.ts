import { z } from "zod";
import {
  CommentWithResources,
  serializedCommentWithResourcesSchema,
} from "../comments/types";
import { buildChannelName } from "../iris/build-channel";
import { ApprovalStepComment, approvalStepCommentSchema } from "./types";

export const realtimeApprovalStepCommentCreatedSchema = z.object({
  type: z.literal("approval-step-comment/created"),
  resource: z.object({
    approvalStepComment: approvalStepCommentSchema,
    comment: serializedCommentWithResourcesSchema,
  }),
  channels: z.array(z.string()),
});

export type RealtimeApprovalStepCommentCreated = z.infer<
  typeof realtimeApprovalStepCommentCreatedSchema
>;

export function realtimeApprovalStepCommentCreated(
  approvalStepComment: ApprovalStepComment,
  comment: CommentWithResources
): RealtimeApprovalStepCommentCreated {
  return {
    type: "approval-step-comment/created",
    resource: { approvalStepComment, comment },
    channels: [
      buildChannelName("approval-steps", approvalStepComment.approvalStepId),
    ],
  };
}

export const realtimeApprovalStepCommentDeletedSchema = z.object({
  type: z.literal("approval-step-comment/deleted"),
  resource: approvalStepCommentSchema,
  channels: z.array(z.string()),
});

export type RealtimeApprovalStepCommentDeleted = z.infer<
  typeof realtimeApprovalStepCommentDeletedSchema
>;

export function realtimeApprovalStepCommentDeleted(
  approvalStepComment: ApprovalStepComment
): RealtimeApprovalStepCommentDeleted {
  return {
    type: "approval-step-comment/deleted",
    resource: approvalStepComment,
    channels: [
      buildChannelName("approval-steps", approvalStepComment.approvalStepId),
    ],
  };
}
