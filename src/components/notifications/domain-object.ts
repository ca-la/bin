import {
  FullTaskCommentCreateNotification,
  FullTaskCommentCreateNotificationRow,
  TaskCommentCreateNotification,
  TaskCommentCreateNotificationRow
} from './models/task-comment-create';
import {
  AnnotationCommentCreateNotification,
  AnnotationCommentCreateNotificationRow,
  FullAnnotationCommentCreateNotification,
  FullAnnotationCommentCreateNotificationRow
} from './models/annotation-comment-create';
import {
  CommitCostInputsNotification,
  CommitCostInputsNotificationRow,
  FullCommitCostInputsNotification,
  FullCommitCostInputsNotificationRow
} from './models/commit-cost-inputs';
import {
  FullInviteCollaboratorNotification,
  FullInviteCollaboratorNotificationRow,
  InviteCollaboratorNotification,
  InviteCollaboratorNotificationRow
} from './models/invite-collaborator';
import {
  FullMeasurementCreateNotification,
  FullMeasurementCreateNotificationRow,
  MeasurementCreateNotification,
  MeasurementCreateNotificationRow
} from './models/measurement-create';
import {
  FullPartnerAcceptServiceBidNotification,
  FullPartnerAcceptServiceBidNotificationRow,
  PartnerAcceptServiceBidNotification,
  PartnerAcceptServiceBidNotificationRow
} from './models/partner-accept-service-bid';
import {
  FullPartnerDesignBidNotification,
  FullPartnerDesignBidNotificationRow,
  PartnerDesignBidNotification,
  PartnerDesignBidNotificationRow
} from './models/partner-design-bid';
import {
  FullPartnerRejectServiceBidNotification,
  FullPartnerRejectServiceBidNotificationRow,
  PartnerRejectServiceBidNotification,
  PartnerRejectServiceBidNotificationRow
} from './models/partner-reject-service-bid';
import {
  FullTaskAssignmentNotification,
  FullTaskAssignmentNotificationRow,
  TaskAssignmentNotification,
  TaskAssignmentNotificationRow
} from './models/task-assignment';
import {
  CollectionSubmitNotification,
  CollectionSubmitNotificationRow,
  FullCollectionSubmitNotification,
  FullCollectionSubmitNotificationRow
} from './models/collection-submit';
import {
  FullTaskCompletionNotification,
  FullTaskCompletionNotificationRow,
  TaskCompletionNotification,
  TaskCompletionNotificationRow
} from './models/task-completion';
import {
  FullTaskCommentMentionNotification,
  FullTaskCommentMentionNotificationRow,
  TaskCommentMentionNotification,
  TaskCommentMentionNotificationRow
} from './models/task-comment-mention';
import {
  AnnotationCommentMentionNotification,
  AnnotationCommentMentionNotificationRow,
  FullAnnotationCommentMentionNotification,
  FullAnnotationCommentMentionNotificationRow
} from './models/annotation-mention';
import toDateOrNull, { toDateStringOrNull } from '../../services/to-date';
import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';
import {
  FullPartnerPairingCommittedNotification,
  FullPartnerPairingCommittedNotificationRow,
  PartnerPairingCommittedNotification,
  PartnerPairingCommittedNotificationRow
} from './models/partner-pairing-committed';
import {
  ExpiredNotification,
  ExpiredNotificationRow,
  FullExpirationNotification,
  OneWeekExpirationNotification,
  OneWeekExpirationNotificationRow,
  TwoDayExpirationNotification,
  TwoDayExpirationNotificationRow
} from './models/costing-expiration';
import {
  AnnotationCommentReplyNotification,
  AnnotationCommentReplyNotificationRow,
  FullAnnotationCommentReplyNotification,
  FullAnnotationCommentReplyNotificationRow
} from './models/annotation-reply';
import {
  FullTaskCommentReplyNotification,
  FullTaskCommentReplyNotificationRow,
  TaskCommentReplyNotification,
  TaskCommentReplyNotificationRow
} from './models/task-comment-reply';
import {
  ApprovalStepCommentMentionNotification,
  ApprovalStepCommentMentionNotificationRow,
  FullApprovalStepCommentMentionNotification,
  FullApprovalStepCommentMentionNotificationRow
} from './models/approval-step-comment-mention';

export enum NotificationType {
  ANNOTATION_COMMENT_CREATE = 'ANNOTATION_COMMENT_CREATE',
  ANNOTATION_COMMENT_MENTION = 'ANNOTATION_COMMENT_MENTION',
  ANNOTATION_COMMENT_REPLY = 'ANNOTATION_COMMENT_REPLY',
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
  TASK_COMMENT_REPLY = 'TASK_COMMENT_REPLY',
  TASK_COMPLETION = 'TASK_COMPLETION',
  COSTING_EXPIRATION_ONE_WEEK = 'COSTING_EXPIRATION_ONE_WEEK',
  COSTING_EXPIRATION_TWO_DAYS = 'COSTING_EXPIRATION_TWO_DAYS',
  COSTING_EXPIRED = 'COSTING_EXPIRED',
  APPROVAL_STEP_COMMENT_MENTION = 'APPROVAL_STEP_COMMENT_MENTION'
}

export type Notification =
  | AnnotationCommentCreateNotification
  | AnnotationCommentMentionNotification
  | AnnotationCommentReplyNotification
  | CollectionSubmitNotification
  | CommitCostInputsNotification
  | InviteCollaboratorNotification
  | MeasurementCreateNotification
  | PartnerAcceptServiceBidNotification
  | PartnerDesignBidNotification
  | PartnerPairingCommittedNotification
  | PartnerRejectServiceBidNotification
  | TaskAssignmentNotification
  | TaskCommentCreateNotification
  | TaskCommentMentionNotification
  | TaskCommentReplyNotification
  | TaskCompletionNotification
  | ExpiredNotification
  | OneWeekExpirationNotification
  | TwoDayExpirationNotification
  | ApprovalStepCommentMentionNotification;

export type FullNotification =
  | FullTaskCompletionNotification
  | FullTaskCommentMentionNotification
  | FullTaskCommentReplyNotification
  | FullTaskCommentCreateNotification
  | FullTaskAssignmentNotification
  | FullPartnerRejectServiceBidNotification
  | FullPartnerPairingCommittedNotification
  | FullPartnerDesignBidNotification
  | FullPartnerAcceptServiceBidNotification
  | FullMeasurementCreateNotification
  | FullInviteCollaboratorNotification
  | FullCommitCostInputsNotification
  | FullCollectionSubmitNotification
  | FullAnnotationCommentMentionNotification
  | FullAnnotationCommentReplyNotification
  | FullAnnotationCommentCreateNotification
  | FullExpirationNotification
  | FullApprovalStepCommentMentionNotification;

export type NotificationRow =
  | AnnotationCommentCreateNotificationRow
  | AnnotationCommentMentionNotificationRow
  | AnnotationCommentReplyNotificationRow
  | CollectionSubmitNotificationRow
  | CommitCostInputsNotificationRow
  | InviteCollaboratorNotificationRow
  | MeasurementCreateNotificationRow
  | PartnerAcceptServiceBidNotificationRow
  | PartnerDesignBidNotificationRow
  | PartnerPairingCommittedNotificationRow
  | PartnerRejectServiceBidNotificationRow
  | TaskAssignmentNotificationRow
  | TaskCommentCreateNotificationRow
  | TaskCommentMentionNotificationRow
  | TaskCommentReplyNotificationRow
  | TaskCompletionNotificationRow
  | ExpiredNotificationRow
  | OneWeekExpirationNotificationRow
  | TwoDayExpirationNotificationRow
  | ApprovalStepCommentMentionNotificationRow;

export type FullNotificationRow =
  | FullTaskCompletionNotificationRow
  | FullTaskCommentMentionNotificationRow
  | FullTaskCommentReplyNotificationRow
  | FullTaskCommentCreateNotificationRow
  | FullTaskAssignmentNotificationRow
  | FullPartnerRejectServiceBidNotificationRow
  | FullPartnerPairingCommittedNotificationRow
  | FullPartnerDesignBidNotificationRow
  | FullPartnerAcceptServiceBidNotificationRow
  | FullMeasurementCreateNotificationRow
  | FullInviteCollaboratorNotificationRow
  | FullCommitCostInputsNotificationRow
  | FullCollectionSubmitNotificationRow
  | FullAnnotationCommentMentionNotificationRow
  | FullAnnotationCommentReplyNotificationRow
  | FullAnnotationCommentCreateNotificationRow
  | FullApprovalStepCommentMentionNotificationRow;

type EqualKeys<T> = { [P in keyof T]: any };

export function encode(
  row: EqualKeys<NotificationRow>
): EqualKeys<Notification> {
  return {
    actionDescription: row.action_description,
    actorUserId: row.actor_user_id,
    annotationId: row.annotation_id,
    approvalStepId: row.approval_step_id,
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
    approval_step_id: data.approvalStepId,
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

export const partialDataAdapter = new DataAdapter<
  Partial<NotificationRow>,
  Partial<Notification>
>();

export function isNotificationRow(row: object): row is NotificationRow {
  return hasProperties(
    row,
    'action_description',
    'actor_user_id',
    'annotation_id',
    'approval_step_id',
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

export function isFullNotificationRow(
  candidate: object
): candidate is FullNotificationRow {
  return (
    isNotificationRow(candidate) &&
    hasProperties(
      candidate,
      'actor',
      'comment_text',
      'component_type',
      'collection_title',
      'design_title',
      'design_image_ids',
      'has_attachments',
      'task_title',
      'annotation_image_id',
      'approval_step_title'
    )
  );
}

function encodeFull(rowData: FullNotificationRow): FullNotification {
  const { actor } = rowData;
  return {
    actionDescription: rowData.action_description,
    actor: {
      ...actor,
      createdAt: new Date(actor.createdAt),
      lastAcceptedPartnerTermsAt: actor.lastAcceptedPartnerTermsAt
        ? new Date(actor.lastAcceptedPartnerTermsAt)
        : null,
      lastAcceptedDesignerTermsAt: actor.lastAcceptedDesignerTermsAt
        ? new Date(actor.lastAcceptedDesignerTermsAt)
        : null
    },
    actorUserId: rowData.actor_user_id,
    annotationId: rowData.annotation_id,
    annotationImageId: rowData.annotation_image_id,
    approvalStepId: rowData.approval_step_id,
    approvalStepTitle: rowData.approval_step_title,
    canvasId: rowData.canvas_id,
    collaboratorId: rowData.collaborator_id,
    collectionId: rowData.collection_id,
    collectionTitle: rowData.collection_title,
    commentText: rowData.comment_text,
    commentId: rowData.comment_id,
    componentType: rowData.component_type,
    createdAt: new Date(rowData.created_at),
    deletedAt: rowData.deleted_at ? new Date(rowData.deleted_at) : null,
    designId: rowData.design_id,
    designImageIds: rowData.design_image_ids,
    designTitle: rowData.design_title,
    hasAttachments: rowData.has_attachments,
    id: rowData.id,
    measurementId: rowData.measurement_id,
    readAt: rowData.read_at ? new Date(rowData.read_at) : null,
    recipientUserId: rowData.recipient_user_id,
    sectionId: rowData.section_id,
    sentEmailAt: rowData.sent_email_at ? new Date(rowData.sent_email_at) : null,
    stageId: rowData.stage_id,
    taskId: rowData.task_id,
    taskTitle: rowData.task_title,
    type: rowData.type
  } as FullNotification;
}

export const fullDataAdapter = new DataAdapter<
  FullNotificationRow,
  FullNotification
>(encodeFull);
