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
import User from '../../domain-objects/user';
import ProductDesign = require('../../domain-objects/product-design');

export enum NotificationType {
  ANNOTATION_CREATE = 'ANNOTATION_CREATE',
  DESIGN_UPDATE = 'DESIGN_UPDATE',
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

export default interface Notification {
  // DEPRECATED
  actionDescription: string | null;
  actorUserId: string;
  annotationId: string | null;
  canvasId: string | null;
  collaboratorId: string | null;
  collectionId: string | null;
  commentId: string | null;
  createdAt: Date;
  designId: string | null;
  id: string;
  recipientUserId: string | null;
  // DEPRECATED
  sectionId: string | null;
  sentEmailAt: Date | null;
  stageId: string | null;
  taskId: string | null;
  type: NotificationType | null;
}

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
  recipient_user_id: string | null;
  // DEPRECATED
  section_id: string | null;
  sent_email_at: Date | null;
  stage_id: string | null;
  task_id: string | null;
  type: NotificationType | null;
}

export interface HydratedNotification extends Notification {
  actor: User;
  annotation: Annotation | null;
  canvas: Canvas | null;
  collection: Collection | null;
  comment: Comment | null;
  design: ProductDesign | null;
  stage: Stage | null;
  task: TaskEvent | null;
}

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

export const dataAdapter = new DataAdapter<
  NotificationRow,
  Notification
>();

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
