import User from "../users/types";

export interface BreadCrumb {
  text: string;
  url: string;
}

export interface Mentions {
  [id: string]: string | undefined;
}

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

export interface NotificationMessageActionBase {
  type: NotificationMessageActionType;
}

interface CommentActionBase extends NotificationMessageActionBase {
  parentCommentId: string;
  designId: string;
}

interface TaskCommentReplyAction extends CommentActionBase {
  type: NotificationMessageActionType.TASK_COMMENT_REPLY;
  taskId: string;
}

interface AnnotationCommentReplyAction extends CommentActionBase {
  type: NotificationMessageActionType.ANNOTATION_COMMENT_REPLY;
  annotationId: string;
}

interface ApprovalStepCommentReplyAction extends CommentActionBase {
  type: NotificationMessageActionType.APPROVAL_STEP_COMMENT_REPLY;
  approvalStepId: string;
}

export type NotificationMessageAction =
  | TaskCommentReplyAction
  | AnnotationCommentReplyAction
  | ApprovalStepCommentReplyAction;

export interface NotificationMessage {
  id: string;
  title: string;
  html: string;
  readAt: Date | null;
  link: string;
  createdAt: Date;
  actor: User | null;
  imageUrl: string | null;
  location: BreadCrumb[];
  attachments: NotificationMessageAttachment[];
  actions: NotificationMessageAction[];
  archivedAt: Date | null;
  matchedFilters: NotificationFilter[];
  text: string;
  type: NotificationType;
}

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
