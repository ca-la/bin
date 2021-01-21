import * as z from "zod";
import { userRoleSchema } from "../users/types";
import { assetLinksSchema, assetSchema } from "../assets/types";

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
  attachments: z.array(assetSchema),
});
export type CommentRow = z.infer<typeof commentRowSchema>;

export const commentWithMentionsSchema = commentSchema.extend({
  mentions: z.record(z.string()),
});
export type CommentWithMentions = z.infer<typeof commentWithMentionsSchema>;

export const commentWithResourcesSchema = commentWithMentionsSchema.extend({
  attachments: z.array(z.intersection(assetSchema, assetLinksSchema.partial())),
});
export type CommentWithResources = z.infer<typeof commentWithResourcesSchema>;

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
