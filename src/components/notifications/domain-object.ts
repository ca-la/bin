import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';

import Annotation, {
  ProductDesignCanvasAnnotationRow as AnnotationRow
} from '../../components/product-design-canvas-annotations/domain-object';
import Canvas, {
  ProductDesignCanvasRow as CanvasRow
} from '../../domain-objects/product-design-canvas';
import Collection, { CollectionRow } from '../../domain-objects/collection';
import Comment, { CommentRow } from '../../domain-objects/comment';
import Stage, {
  ProductDesignStageRow as StageRow
} from '../../domain-objects/product-design-stage';
import TaskEvent, { TaskEventRow } from '../../domain-objects/task-event';
import User = require('../../domain-objects/user');
import ProductDesign = require('../../domain-objects/product-design');

export enum NotificationType {
  ANNOTATION_CREATE = 'ANNOTATION_CREATE',
  DESIGN_UPDATE = 'DESIGN_UPDATE',
  MEASUREMENT_CREATE = 'MEASUREMENT_CREATE',
  SECTION_DELETE = 'SECTION_DELETE',
  SECTION_CREATE = 'SECTION_CREATE',
  SECTION_UPDATE = 'SECTION_UPDATE',
  TASK_ASSIGNMENT = 'TASK_ASSIGNMENT',
  TASK_COMMENT_CREATE = 'TASK_COMMENT_CREATE',
  TASK_COMPLETION = 'TASK_COMPLETION',
  PARTNER_ACCEPT_SERVICE_BID = 'PARTNER_ACCEPT_SERVICE_BID',
  PARTNER_REJECT_SERVICE_BID = 'PARTNER_REJECT_SERVICE_BID',
  COLLECTION_SUBMIT = 'COLLECTION_SUBMIT',
  COMMIT_COST_INPUTS = 'COMMIT_COST_INPUTS',
  PARTNER_DESIGN_BID = 'PARTNER_DESIGN_BID',
  INVITE_COLLABORATOR = 'INVITE_COLLABORATOR'
}

export interface BaseNotification {
  actorUserId: string;
  createdAt: Date;
  id: string;
  sentEmailAt: Date | null;
}

export interface AnnotationNotification extends BaseNotification {
  annotationId: string;
  canvasId: string;
  collectionId: string;
  designId: string;
  recipientUserId: string;
  type: NotificationType.ANNOTATION_CREATE;
}

export interface CollectionSubmitNotification extends BaseNotification {
  collectionId: string;
  recipientUserId: string;
  type: NotificationType.COLLECTION_SUBMIT;
}

export interface ImmediateCostedCollectionNotification extends BaseNotification {
  collectionId: string;
  recipientUserId: string;
  sentEmailAt: Date;
  type: NotificationType.COMMIT_COST_INPUTS;
}

export interface ImmediateInviteNotification extends BaseNotification {
  actorUserId: string;
  collaboratorId: string;
  collectionId: string | null;
  designId: string | null;
  recipientUserId: string | null;
  sentEmailAt: Date;
  type: NotificationType.INVITE_COLLABORATOR;
}

export interface MeasurementNotification extends BaseNotification {
  canvasId: string;
  collectionId: string;
  designId: string;
  measurementId: string;
  recipientUserId: string;
  type: NotificationType.MEASUREMENT_CREATE;
}

export interface PartnerAcceptBidNotification extends BaseNotification {
  designId: string;
  recipientUserId: string;
  type: NotificationType.PARTNER_ACCEPT_SERVICE_BID;
}

export interface PartnerDesignBidNotification extends BaseNotification {
  designId: string;
  recipientUserId: string;
  type: NotificationType.PARTNER_DESIGN_BID;
}

export interface PartnerRejectBidNotification extends BaseNotification {
  designId: string;
  recipientUserId: string;
  type: NotificationType.PARTNER_REJECT_SERVICE_BID;
}

// Deprecated (v1 notification)
export interface SectionCreateNotification extends BaseNotification {
  actionDescription: string;
  actorUserId: string;
  designId: string;
  recipientUserId: string;
  sectionId: string;
  type: NotificationType.SECTION_CREATE;
}

// Deprecated (v1 notification)
export interface SectionDeleteNotification extends BaseNotification {
  actionDescription: string;
  designId: string;
  recipientUserId: string;
  type: NotificationType.SECTION_DELETE;
}

// Deprecated (v1 notification)
export interface SectionUpdateNotification extends BaseNotification {
  actionDescription: string;
  designId: string;
  recipientUserId: string;
  sectionId: string;
  type: NotificationType.SECTION_UPDATE;
}

export interface TaskAssignmentNotification extends BaseNotification {
  collaboratorId: string;
  collectionId: string | null;
  designId: string;
  recipientUserId: string | null;
  stageId: string;
  taskId: string;
  type: NotificationType.TASK_ASSIGNMENT;
}

export interface TaskCommentCreateNotification extends BaseNotification {
  collectionId: string | null;
  commentId: string;
  designId: string;
  recipientUserId: string;
  stageId: string;
  taskId: string;
  type: NotificationType.TASK_COMMENT_CREATE;
}

export interface TaskCompleteNotification extends BaseNotification {
  collaboratorId: string;
  collectionId: string | null;
  designId: string;
  recipientUserId: string | null;
  stageId: string;
  taskId: string;
  type: NotificationType.TASK_COMPLETION;
}

export type Notification =
  AnnotationNotification |
  CollectionSubmitNotification |
  ImmediateCostedCollectionNotification |
  ImmediateInviteNotification |
  MeasurementNotification |
  PartnerAcceptBidNotification |
  PartnerDesignBidNotification |
  PartnerRejectBidNotification |
  SectionCreateNotification  |
  SectionDeleteNotification |
  SectionUpdateNotification |
  TaskAssignmentNotification |
  TaskCommentCreateNotification |
  TaskCompleteNotification;

export interface NotificationRow {
  // DEPRECATED
  action_description: string | null;
  actor_user_id: string;
  annotation_id: string | null;
  canvas_id: string | null;
  collaborator_id: string | null;
  collection_id: string | null;
  comment_id: string | null;
  created_at: Date;
  design_id: string | null;
  id: string;
  measurement_id: string | null;
  recipient_user_id: string | null;
  // DEPRECATED
  section_id: string | null;
  sent_email_at: Date | null;
  stage_id: string | null;
  task_id: string | null;
  type: NotificationType | null;
}

export type HydratedNotification = Notification & {
  actor: User;
  annotation: Annotation | null;
  canvas: Canvas | null;
  collection: Collection | null;
  comment: Comment | null;
  design: ProductDesign | null;
  stage: Stage | null;
  task: TaskEvent | null;
};

export interface HydratedNotificationRow extends NotificationRow {
  actor: User;
  annotation: AnnotationRow | null;
  canvas: CanvasRow | null;
  collection: CollectionRow | null;
  comment: CommentRow | null;
  design: ProductDesign | null;
  stage: StageRow | null;
  task: TaskEventRow | null;
}

export function dataAdapter<T extends Notification>(): DataAdapter<NotificationRow, T> {
  return new DataAdapter<NotificationRow, T>();
}

export const hydratedDataAdapter = new DataAdapter<
  HydratedNotificationRow,
  HydratedNotification
>();

export function isNotificationRow(row: object):
  row is NotificationRow {
  return hasProperties(
    row,
    'action_description',
    'actor_user_id',
    'annotation_id',
    'canvas_id',
    'collaborator_id',
    'collection_id',
    'comment_id',
    'created_at',
    'design_id',
    'id',
    'measurement_id',
    'recipient_user_id',
    'section_id',
    'sent_email_at',
    'stage_id',
    'task_id',
    'type'
  );
}

export function isHydratedNotificationRow(row: object): row is HydratedNotificationRow {
  return isNotificationRow(row) && hasProperties(
    row,
    'actor',
    'annotation',
    'canvas',
    'collection',
    'comment',
    'design',
    'stage',
    'task'
  );
}

export interface BreadCrumb {
  text: string;
  url: string;
}

export interface NotificationMessageAttachment {
  text: string;
  url: string;
}

export interface NotificationMessage {
  id: string;
  html: string;
  createdAt: Date;
  actor: User | null;
  imageUrl: string | null;
  location: BreadCrumb[];
  attachments: NotificationMessageAttachment[];
}
