import { z } from "zod";
import { commentRowSchema, commentSchema } from "../comments/types";

export const submissionCommentSchema = z.object({
  commentId: z.string(),
  submissionId: z.string(),
});

export type SubmissionComment = z.infer<typeof submissionCommentSchema>;

export const submissionCommentRowSchema = z.object({
  comment_id: submissionCommentSchema.shape.commentId,
  submission_id: submissionCommentSchema.shape.submissionId,
});

export type SubmissionCommentRow = z.infer<typeof submissionCommentRowSchema>;

export const commentWithMetaSchema = commentSchema.extend({
  submissionId: z.string(),
});

export type CommentWithMeta = z.infer<typeof commentWithMetaSchema>;

export const commentWithMetaRowSchema = commentRowSchema.extend({
  submission_id: commentWithMetaSchema.shape.submissionId,
});

export type CommentWithMetaRow = z.infer<typeof commentWithMetaRowSchema>;
