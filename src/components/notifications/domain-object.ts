import {
  AnnotationCommentCreateNotification,
  AnnotationCommentCreateNotificationRow
} from './models/annotation-comment-create';
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
import {
  TaskAssigmentNotification,
  TaskAssigmentNotificationRow
} from './models/task-assignment';
import {
  TaskCommentCreateNotification,
  TaskCommentCreateNotificationRow
} from './models/task-comment-create';
import {
  TaskCompletionNotification,
  TaskCompletionNotificationRow
} from './models/task-completion';
import {
  TaskCommentMentionNotification,
  TaskCommentMentionNotificationRow
} from './models/task-comment-mention';
import {
  AnnotationCommentMentionNotification,
  AnnotationCommentMentionNotificationRow
} from './models/annotation-mention';
import toDateOrNull, { toDateStringOrNull } from '../../services/to-date';
import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';
import {
  PartnerPairingCommittedNotification,
  PartnerPairingCommittedNotificationRow
} from './models/partner-pairing-committed';
import {
  ExpiredNotification,
  ExpiredNotificationRow,
  OneWeekExpirationNotification,
  OneWeekExpirationNotificationRow,
  TwoDayExpirationNotification,
  TwoDayExpirationNotificationRow
} from './models/costing-expiration';

export enum NotificationType {
  ANNOTATION_COMMENT_CREATE = 'ANNOTATION_COMMENT_CREATE',
  ANNOTATION_COMMENT_MENTION = 'ANNOTATION_COMMENT_MENTION',
  COLLECTION_SUBMIT = 'COLLECTION_SUBMIT',
  COMMIT_COST_INPUTS = 'COMMIT_COST_INPUTS',
  INVITE_COLLABORATOR = 'INVITE_COLLABORATOR',
  MEASUREMENT_CREATE = 'MEASUREMENT_CREATE',
  PARTNER_ACCEPT_SERVICE_BID = 'PARTNER_ACCEPT_SERVICE_BID',
  PARTNER_DESIGN_BID = 'PARTNER_DESIGN_BID',
  PARTNER_PAIRING_COMMITTED = 'PARTNER_PAIRING_COMMITTED',
  PARTNER_REJECT_SERVICE_BID = 'PARTNER_REJECT_SERVICE_BID',
  TASK_ASSIGNMENT = 'TASK_ASSIGNMENT',
  TASK_COMMENT_CREATE = 'TASK_COMMENT_CREATE',
  TASK_COMMENT_MENTION = 'TASK_COMMENT_MENTION',
  TASK_COMPLETION = 'TASK_COMPLETION',
  COSTING_EXPIRATION_ONE_WEEK = 'COSTING_EXPIRATION_ONE_WEEK',
  COSTING_EXPIRATION_TWO_DAYS = 'COSTING_EXPIRATION_TWO_DAYS',
  COSTING_EXPIRED = 'COSTING_EXPIRED'
}

export type Notification =
  | AnnotationCommentCreateNotification
  | AnnotationCommentMentionNotification
  | CollectionSubmitNotification
  | CommitCostInputsNotification
  | InviteCollaboratorNotification
  | MeasurementCreateNotification
  | PartnerAcceptServiceBidNotification
  | PartnerDesignBidNotification
  | PartnerPairingCommittedNotification
  | PartnerRejectServiceBidNotification
  | TaskAssigmentNotification
  | TaskCommentCreateNotification
  | TaskCommentMentionNotification
  | TaskCompletionNotification
  | ExpiredNotification
  | OneWeekExpirationNotification
  | TwoDayExpirationNotification;

export type NotificationRow =
  | AnnotationCommentCreateNotificationRow
  | AnnotationCommentMentionNotificationRow
  | CollectionSubmitNotificationRow
  | CommitCostInputsNotificationRow
  | InviteCollaboratorNotificationRow
  | MeasurementCreateNotificationRow
  | PartnerAcceptServiceBidNotificationRow
  | PartnerDesignBidNotificationRow
  | PartnerPairingCommittedNotificationRow
  | PartnerRejectServiceBidNotificationRow
  | TaskAssigmentNotificationRow
  | TaskCommentCreateNotificationRow
  | TaskCommentMentionNotificationRow
  | TaskCompletionNotificationRow
  | ExpiredNotificationRow
  | OneWeekExpirationNotificationRow
  | TwoDayExpirationNotificationRow;

type EqualKeys<T> = { [P in keyof T]: any };

export function encode(
  row: EqualKeys<NotificationRow>
): EqualKeys<Notification> {
  return {
    actionDescription: row.action_description,
    actorUserId: row.actor_user_id,
    annotationId: row.annotation_id,
    canvasId: row.canvas_id,
    collaboratorId: row.collaborator_id,
    collectionId: row.collection_id,
    commentId: row.comment_id,
    createdAt: new Date(row.created_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    designId: row.design_id,
    id: row.id,
    measurementId: row.measurement_id,
    readAt: row.read_at,
    recipientUserId: row.recipient_user_id,
    sectionId: row.section_id,
    sentEmailAt: toDateOrNull(row.sent_email_at),
    stageId: row.stage_id,
    taskId: row.task_id,
    type: row.type
  };
}

export function decode(
  data: EqualKeys<Notification>
): EqualKeys<NotificationRow> {
  return {
    action_description: data.actionDescription,
    actor_user_id: data.actorUserId,
    annotation_id: data.annotationId,
    canvas_id: data.canvasId,
    collaborator_id: data.collaboratorId,
    collection_id: data.collectionId,
    comment_id: data.commentId,
    created_at: data.createdAt.toISOString(),
    deleted_at: data.deletedAt ? data.deletedAt.toISOString() : null,
    design_id: data.designId,
    id: data.id,
    measurement_id: data.measurementId,
    read_at: toDateStringOrNull(data.readAt),
    recipient_user_id: data.recipientUserId,
    section_id: data.sectionId,
    sent_email_at: toDateStringOrNull(data.sentEmailAt),
    stage_id: data.stageId,
    task_id: data.taskId,
    type: data.type
  };
}
export const dataAdapter = new DataAdapter<NotificationRow, Notification>();

export function isNotificationRow(row: object): row is NotificationRow {
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
    'deleted_at',
    'design_id',
    'id',
    'measurement_id',
    'read_at',
    'recipient_user_id',
    'section_id',
    'sent_email_at',
    'stage_id',
    'task_id',
    'type'
  );
}

export const DEPRECATED_NOTIFICATION_TYPES = [
  'ANNOTATION_CREATE',
  'create-section',
  'create-selected-option',
  'DESIGN_UPDATE',
  'delete-section',
  'delete-selected-option',
  'SECTION_CREATE',
  'SECTION_DELETE',
  'SECTION_UPDATE',
  'update-design',
  'update-feature-placement',
  'update-section',
  'update-selected-option'
];
