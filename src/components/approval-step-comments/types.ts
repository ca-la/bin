import { z } from "zod";

import { createCommentWithAttachmentsSchema } from "../comments/types";

export const createRevisionRequestSchema = z.object({
  comment: createCommentWithAttachmentsSchema,
});

export type CreateRevisionRequest = z.infer<typeof createRevisionRequestSchema>;

export const approvalStepCommentSchema = z.object({
  commentId: z.string(),
  approvalStepId: z.string(),
});

export type ApprovalStepComment = z.infer<typeof approvalStepCommentSchema>;

export const approvalStepCommentRowSchema = z.object({
  comment_id: approvalStepCommentSchema.shape.commentId,
  approval_step_id: approvalStepCommentSchema.shape.approvalStepId,
});

export type ApprovalStepCommentRow = z.infer<
  typeof approvalStepCommentRowSchema
>;
