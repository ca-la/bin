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
}

export enum NotificationFilter {
  UNARCHIVED = "UNARCHIVED",
  ARCHIVED = "ARCHIVED",
  INBOX = "INBOX",
}
