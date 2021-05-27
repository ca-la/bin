import { z } from "zod";
import { userSchema } from "../users/types";

export const breadCrumbSchema = z.object({
  text: z.string(),
  url: z.string(),
});
export type BreadCrumb = z.infer<typeof breadCrumbSchema>;

export const mentionsSchema = z.record(z.string().optional());
export type Mentions = z.infer<typeof mentionsSchema>;

export const notificationMessageAttachmentSchema = z.object({
  text: z.string(),
  url: z.string(),
  mentions: mentionsSchema.optional(),
  hasAttachments: z.boolean().optional(),
});
export interface NotificationMessageAttachment {
  text: string;
  url: string;
  mentions?: Mentions;
  hasAttachments?: boolean;
}

export enum NotificationMessageActionType {
  ANNOTATION_COMMENT_REPLY = "ANNOTATION_COMMENT_REPLY",
  TASK_COMMENT_REPLY = "TASK_COMMENT_REPLY",
  APPROVAL_STEP_COMMENT_REPLY = "APPROVAL_STEP_COMMENT_REPLY",
}

export const notificationMessageActionBaseSchema = z.object({
  type: z.nativeEnum(NotificationMessageActionType),
});
export type NotificationMessageActionBase = z.infer<
  typeof notificationMessageActionBaseSchema
>;

const commentActionBaseSchema = notificationMessageActionBaseSchema.extend({
  parentCommentId: z.string(),
  designId: z.string(),
});

const taskCommentReplyActionSchema = commentActionBaseSchema.extend({
  type: z.literal(NotificationMessageActionType.TASK_COMMENT_REPLY),
  taskId: z.string(),
});

const annotationCommentReplyActionSchema = commentActionBaseSchema.extend({
  type: z.literal(NotificationMessageActionType.ANNOTATION_COMMENT_REPLY),
  annotationId: z.string(),
});

const approvalStepCommentReplyActionSchema = commentActionBaseSchema.extend({
  type: z.literal(NotificationMessageActionType.APPROVAL_STEP_COMMENT_REPLY),
  approvalStepId: z.string(),
});

export const notificationMessageActionSchema = z.union([
  taskCommentReplyActionSchema,
  annotationCommentReplyActionSchema,
  approvalStepCommentReplyActionSchema,
]);

export type NotificationMessageAction = z.infer<
  typeof notificationMessageActionSchema
>;

export enum NotificationFilter {
  UNARCHIVED = "UNARCHIVED",
  ARCHIVED = "ARCHIVED",
  INBOX = "INBOX",
}

export enum NotificationType {
  ANNOTATION_COMMENT_CREATE = "ANNOTATION_COMMENT_CREATE",
  ANNOTATION_COMMENT_MENTION = "ANNOTATION_COMMENT_MENTION",
  ANNOTATION_COMMENT_REPLY = "ANNOTATION_COMMENT_REPLY",
  COLLECTION_SUBMIT = "COLLECTION_SUBMIT",
  COMMIT_COST_INPUTS = "COMMIT_COST_INPUTS",
  INVITE_COLLABORATOR = "INVITE_COLLABORATOR",
  INVITE_TEAM_USER = "INVITE_TEAM_USER",
  MEASUREMENT_CREATE = "MEASUREMENT_CREATE",
  PARTNER_ACCEPT_SERVICE_BID = "PARTNER_ACCEPT_SERVICE_BID",
  PARTNER_DESIGN_BID = "PARTNER_DESIGN_BID",
  PARTNER_REJECT_SERVICE_BID = "PARTNER_REJECT_SERVICE_BID",
  TASK_ASSIGNMENT = "TASK_ASSIGNMENT",
  TASK_COMMENT_CREATE = "TASK_COMMENT_CREATE",
  TASK_COMMENT_MENTION = "TASK_COMMENT_MENTION",
  TASK_COMMENT_REPLY = "TASK_COMMENT_REPLY",
  TASK_COMPLETION = "TASK_COMPLETION",
  COSTING_EXPIRATION_ONE_WEEK = "COSTING_EXPIRATION_ONE_WEEK",
  COSTING_EXPIRATION_TWO_DAYS = "COSTING_EXPIRATION_TWO_DAYS",
  COSTING_EXPIRED = "COSTING_EXPIRED",
  APPROVAL_STEP_COMMENT_MENTION = "APPROVAL_STEP_COMMENT_MENTION",
  APPROVAL_STEP_COMMENT_REPLY = "APPROVAL_STEP_COMMENT_REPLY",
  APPROVAL_STEP_COMMENT_CREATE = "APPROVAL_STEP_COMMENT_CREATE",
  APPROVAL_STEP_ASSIGNMENT = "APPROVAL_STEP_ASSIGNMENT",
  APPROVAL_STEP_COMPLETION = "APPROVAL_STEP_COMPLETION",
  APPROVAL_STEP_PAIRING = "APPROVAL_STEP_PAIRING",
  APPROVAL_STEP_SUBMISSION_ASSIGNMENT = "APPROVAL_STEP_SUBMISSION_ASSIGNMENT",
  APPROVAL_STEP_SUBMISSION_APPROVAL = "APPROVAL_STEP_SUBMISSION_APPROVAL",
  APPROVAL_STEP_SUBMISSION_REVISION_REQUEST = "APPROVAL_STEP_SUBMISSION_REVISION_REQUEST",
  APPROVAL_STEP_SUBMISSION_REREVIEW_REQUEST = "APPROVAL_STEP_SUBMISSION_REREVIEW_REQUEST",
  SHIPMENT_TRACKING_CREATE = "SHIPMENT_TRACKING_CREATE",
  SHIPMENT_TRACKING_UPDATE = "SHIPMENT_TRACKING_UPDATE",
}

export const notificationMessageSchema = z.object({
  id: z.string(),
  title: z.string(),
  html: z.string(),
  readAt: z.date().nullable(),
  link: z.string(),
  createdAt: z.date(),
  actor: userSchema.nullable(),
  imageUrl: z.string().nullable(),
  location: z.array(breadCrumbSchema),
  attachments: z.array(notificationMessageAttachmentSchema),
  actions: z.array(notificationMessageActionSchema),
  archivedAt: z.date().nullable(),
  matchedFilters: z.array(z.nativeEnum(NotificationFilter)),
  text: z.string(),
  type: z.nativeEnum(NotificationType),
});

export type NotificationMessage = z.infer<typeof notificationMessageSchema>;

// GraphQL doesn't allow arbitrary schemaless object like Mention
export interface MentionForGraphQL {
  id: string;
  name: string | undefined;
}

export type NotificationMessageAttachmentForGraphQL = Omit<
  NotificationMessageAttachment,
  "mentions"
> & {
  mentions?: MentionForGraphQL[];
};

export type NotificationMessageForGraphQL = Omit<
  NotificationMessage,
  "attachments"
> & {
  attachments: NotificationMessageAttachmentForGraphQL[];
};
