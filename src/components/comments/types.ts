import * as z from "zod";

import { userRoleSchema } from "../users/types";
import { assetLinksSchema, assetRowSchema, assetSchema } from "../assets/types";
import {
  dateStringToDate,
  nullableDateStringToNullableDate,
} from "../../services/zod-helpers";

export const baseCommentSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  deletedAt: z.date().nullable(),
  text: z.string(),
  parentCommentId: z.string().nullable(),
  userId: z.string(),
  isPinned: z.boolean(),
});
export type BaseComment = z.infer<typeof baseCommentSchema>;

export const commentSchema = baseCommentSchema.extend({
  userName: z.string().nullable(),
  userEmail: z.string().nullable(),
  userRole: userRoleSchema,
  attachments: z.array(assetSchema),
  replyCount: z.number(),
});
export type Comment = z.infer<typeof commentSchema>;

export const baseCommentRowSchema = z.object({
  id: z.string(),
  created_at: z.date(),
  deleted_at: z.date().nullable(),
  text: z.string(),
  parent_comment_id: z.string().nullable(),
  user_id: z.string(),
  is_pinned: z.boolean(),
});
export type BaseCommentRow = z.infer<typeof baseCommentRowSchema>;

export const commentRowSchema = baseCommentRowSchema.extend({
  user_name: z.string().nullable(),
  user_email: z.string().nullable(),
  user_role: userRoleSchema,
  attachments: z.array(assetRowSchema),
  reply_count: z.number(),
});
export type CommentRow = z.infer<typeof commentRowSchema>;

export const commentWithMentionsSchema = commentSchema.extend({
  mentions: z.record(z.string().optional()),
});
export type CommentWithMentions = z.infer<typeof commentWithMentionsSchema>;

export const commentWithResourcesSchema = commentWithMentionsSchema.extend({
  attachments: z.array(z.intersection(assetSchema, assetLinksSchema)),
});
export type CommentWithResources = z.infer<typeof commentWithResourcesSchema>;

export const createCommentWithAttachmentsSchema = baseCommentSchema.extend({
  createdAt: dateStringToDate,
  attachments: z.array(
    assetSchema.extend({
      createdAt: dateStringToDate,
      uploadCompletedAt: nullableDateStringToNullableDate,
    })
  ),
});

export type CreateCommentWithAttachments = z.infer<
  typeof createCommentWithAttachmentsSchema
>;

export const serializedCreateCommentWithAttachmentsSchema = baseCommentSchema.extend(
  {
    createdAt: z.string(),
    attachments: z.array(
      assetSchema.extend({
        createdAt: z.string(),
        uploadCompletedAt: z.string().nullable(),
      })
    ),
  }
);

export type SerializedCreateCommentWithAttachments = z.infer<
  typeof serializedCreateCommentWithAttachmentsSchema
>;

export enum MentionType {
  COLLABORATOR = "collaborator",
  TEAM_USER = "teamUser",
}
export const mentionTypeSchema = z.nativeEnum(MentionType);

export const mentionMetaSchema = z.object({
  id: z.string(),
  type: mentionTypeSchema,
});
export type MentionMeta = z.infer<typeof mentionMetaSchema>;

export function isMentionType(candidate: string): candidate is MentionType {
  return mentionTypeSchema.safeParse(candidate).success;
}

export default Comment;

export interface PaginatedComments {
  data: CommentWithResources[];
  previousCursor: string | null;
  nextCursor: string | null;
}
