import { z } from "zod";
import {
  serializedCommentWithResourcesSchema,
  CommentWithResources,
} from "../comments/types";
import { buildChannelName } from "../iris/build-channel";

export const realtimeSubmissionCommentDeletedSchema = z.object({
  type: z.literal("submission-comment/deleted"),
  channels: z.tuple([z.string()]),
  resource: z.object({
    commentId: z.string(),
    submissionId: z.string(),
    actorId: z.string(),
  }),
});

export type RealtimeSubmissionCommentDeleted = z.infer<
  typeof realtimeSubmissionCommentDeletedSchema
>;

export function realtimeSubmissionCommentDeleted(
  submissionId: string,
  actorId: string,
  commentId: string
): RealtimeSubmissionCommentDeleted {
  return {
    type: "submission-comment/deleted",
    channels: [buildChannelName("submissions", submissionId)],
    resource: {
      commentId,
      submissionId,
      actorId,
    },
  };
}

export const realtimeSubmissionCommentCreatedSchema = z.object({
  type: z.literal("submission-comment/created"),
  channels: z.tuple([z.string()]),
  resource: z.object({
    comment: serializedCommentWithResourcesSchema,
    submissionId: z.string(),
  }),
});

export type RealtimeSubmissionCommentCreated = z.infer<
  typeof realtimeSubmissionCommentCreatedSchema
>;

export function realtimeSubmissionCommentCreated(
  submissionId: string,
  comment: CommentWithResources
): RealtimeSubmissionCommentCreated {
  return {
    type: "submission-comment/created",
    channels: [buildChannelName("submissions", submissionId)],
    resource: {
      comment,
      submissionId,
    },
  };
}
