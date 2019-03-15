import {
  AnnotationCreateNotification,
  AnnotationCreateNotificationRow
} from './models/annotation-create';
import {
  CollectionSubmitNotification,
  CollectionSubmitNotificationRow
} from './models/collection-submit';
import {
  CommitCostInputsNotification,
  CommitCostInputsNotificationRow
} from './models/commit-cost-inputs';
import {
  InviteCollaboratorNotification,
  InviteCollaboratorNotificationRow
} from './models/invite-collaborator';
import {
  MeasurementCreateNotification,
  MeasurementCreateNotificationRow
} from './models/measurement-create';
import {
  PartnerAcceptServiceBidNotification,
  PartnerAcceptServiceBidNotificationRow
} from './models/partner-accept-service-bid';
import {
  PartnerDesignBidNotification,
  PartnerDesignBidNotificationRow
} from './models/partner-design-bid';
import {
  PartnerRejectServiceBidNotification,
  PartnerRejectServiceBidNotificationRow
} from './models/partner-reject-service-bid';
import { TaskAssigmentNotification, TaskAssigmentNotificationRow } from './models/task-assignment';
import {
  TaskCommentCreateNotification,
  TaskCommentCreateNotificationRow
} from './models/task-comment-create';
import {
  TaskCompletionNotification,
  TaskCompletionNotificationRow
} from './models/task-completion';
import toDateOrNull, { toDateStringOrNull } from '../../services/to-date';
import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';

export enum NotificationType {
  ANNOTATION_CREATE = 'ANNOTATION_CREATE',
  MEASUREMENT_CREATE = 'MEASUREMENT_CREATE',
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

export type Notification =
  | AnnotationCreateNotification
  | CollectionSubmitNotification
  | CommitCostInputsNotification
  | InviteCollaboratorNotification
  | MeasurementCreateNotification
  | PartnerAcceptServiceBidNotification
  | PartnerDesignBidNotification
  | PartnerRejectServiceBidNotification
  | TaskAssigmentNotification
  | TaskCommentCreateNotification
  | TaskCompletionNotification;

export type NotificationRow =
  | AnnotationCreateNotificationRow
  | CollectionSubmitNotificationRow
  | CommitCostInputsNotificationRow
  | InviteCollaboratorNotificationRow
  | MeasurementCreateNotificationRow
  | PartnerAcceptServiceBidNotificationRow
  | PartnerDesignBidNotificationRow
  | PartnerRejectServiceBidNotificationRow
  | TaskAssigmentNotificationRow
  | TaskCommentCreateNotificationRow
  | TaskCompletionNotificationRow;

type EqualKeys<T> = {
  [P in keyof T]: any;
};

export function encode(row: EqualKeys<NotificationRow>): EqualKeys<Notification> {
  return {
    actionDescription: row.action_description,
    actorUserId: row.actor_user_id,
    annotationId: row.annotation_id,
    canvasId: row.canvas_id,
    collaboratorId: row.collaborator_id,
    collectionId: row.collection_id,
    commentId: row.comment_id,
    createdAt: new Date(row.created_at),
    designId: row.design_id,
    id: row.id,
    measurementId: row.measurement_id,
    recipientUserId: row.recipient_user_id,
    sectionId: row.section_id,
    sentEmailAt: toDateOrNull(row.sent_email_at),
    stageId: row.stage_id,
    taskId: row.task_id,
    type: row.type
  };
}

export function decode(data: EqualKeys<Notification>): EqualKeys<NotificationRow> {
  return {
    action_description: data.actionDescription,
    actor_user_id: data.actorUserId,
    annotation_id: data.annotationId,
    canvas_id: data.canvasId,
    collaborator_id: data.collaboratorId,
    collection_id: data.collectionId,
    comment_id: data.commentId,
    created_at: data.createdAt.toISOString(),
    design_id: data.designId,
    id: data.id,
    measurement_id: data.measurementId,
    recipient_user_id: data.recipientUserId,
    section_id: data.sectionId,
    sent_email_at: toDateStringOrNull(data.sentEmailAt),
    stage_id: data.stageId,
    task_id: data.taskId,
    type: data.type
  };
}
export const dataAdapter = new DataAdapter<NotificationRow, Notification>();

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
