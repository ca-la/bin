import { NotificationType } from "../types";
import User from "../../users/types";

/**
 * These base notification types are set to null so that in the notifications that inherit from
 * this, we don't have to specify the fields that need to be null
 */
export interface BaseNotificationRow {
  action_description: null; // DEPRECATED
  actor_user_id: string;
  annotation_id: null;
  approval_step_id: null;
  approval_submission_id: null;
  archived_at: string | null;
  canvas_id: null;
  collaborator_id: null;
  collection_id: null;
  comment_id: null;
  created_at: string;
  deleted_at: string | null;
  design_id: null;
  id: string;
  measurement_id: null;
  read_at: string | null;
  recipient_user_id: null;
  recipient_collaborator_id: null;
  recipient_team_user_id: null;
  section_id: null; // DEPRECATED
  sent_email_at: string | null;
  shipment_tracking_id: null;
  shipment_tracking_event_id: null;
  stage_id: null;
  task_id: null;
  team_id: null;
  type: NotificationType;
}

export interface RowKeyMapping {
  action_description: "actionDescription";
  actor_user_id: "actorUserId";
  annotation_id: "annotationId";
  approval_step_id: "approvalStepId";
  approval_submission_id: "approvalSubmissionId";
  archived_at: "archivedAt";
  canvas_id: "canvasId";
  collaborator_id: "collaboratorId";
  collection_id: "collectionId";
  comment_id: "commentId";
  created_at: "createdAt";
  deleted_at: "deletedAt";
  design_id: "designId";
  id: "id";
  measurement_id: "measurementId";
  read_at: "readAt";
  recipient_user_id: "recipientUserId";
  recipient_collaborator_id: "recipientCollaboratorId";
  recipient_team_user_id: "recipientTeamUserId";
  section_id: "sectionId"; // DEPRECATED
  sent_email_at: "sentEmailAt";
  shipment_tracking_id: "shipmentTrackingId";
  stage_id: "stageId";
  task_id: "taskId";
  team_id: "teamId";
  type: "type";
}

export interface BaseFullNotificationRow {
  actor: User;
  comment_text: null;
  component_type: null;
  collection_title: null;
  design_title: null;
  design_image_ids: string[];
  has_attachments: boolean;
  task_title: null;
  annotation_image_id: null;
  approval_step_title: null;
  approval_submission_title: null;
  shipment_tracking_description: null;
  tracking_event_tag: null;
  tracking_event_subtag: null;
  tracking_id: null;
  team_title: null;
  team_user_email: null;
}

export interface BaseNotification {
  actionDescription: null; // DEPRECATED
  actorUserId: string;
  annotationId: null;
  approvalStepId: null;
  approvalSubmissionId: null;
  archivedAt: Date | null;
  canvasId: null;
  collaboratorId: null;
  collectionId: null;
  commentId: null;
  createdAt: Date;
  deletedAt: Date | null;
  designId: null;
  id: string;
  measurementId: null;
  readAt: Date | null;
  recipientUserId: null;
  recipientCollaboratorId: null;
  recipientTeamUserId: null;
  sectionId: null; // DEPRECATED
  sentEmailAt: Date | null;
  shipmentTrackingId: null;
  shipmentTrackingEventId: null;
  stageId: null;
  taskId: null;
  teamId: null;
  type: NotificationType;
}

export interface StrictNotification {
  actionDescription: string; // DEPRECATED
  actorUserId: string;
  annotationId: string;
  approvalStepId: string;
  approvalSubmissionId: string;
  archivedAt: Date | null;
  canvasId: string;
  collaboratorId: string;
  collectionId: string;
  commentId: string;
  createdAt: Date;
  deletedAt: Date | null;
  designId: string;
  id: string;
  measurementId: string;
  readAt: Date | null;
  recipientUserId: string;
  recipientCollaboratorId: string;
  recipientTeamUserId: string;
  sectionId: string; // DEPRECATED
  sentEmailAt: Date | null;
  shipmentTrackingEventId: string;
  shipmentTrackingId: string;
  stageId: string;
  taskId: string;
  teamId: string;
  type: NotificationType;
}

export interface BaseFullNotification {
  actor: User;
  commentText: null;
  componentType: null;
  collectionTitle: null;
  designTitle: null;
  designImageIds: string[];
  hasAttachments: boolean;
  taskTitle: null;
  annotationImageId: null;
  approvalStepTitle: null;
  approvalSubmissionTitle: null;
  shipmentTrackingDescription: null;
  teamTitle: null;
  teamUserEmail: null;
  trackingId: null;
  trackingEventTag: null;
  trackingEventSubtag: null;
}

export const templateNotification = {
  actionDescription: null, // DEPRECATED
  annotationId: null,
  approvalStepId: null,
  approvalSubmissionId: null,
  archivedAt: null,
  canvasId: null,
  collaboratorId: null,
  collectionId: null,
  commentId: null,
  deletedAt: null,
  designId: null,
  measurementId: null,
  readAt: null,
  recipientUserId: null,
  recipientCollaboratorId: null,
  recipientTeamUserId: null,
  sectionId: null, // DEPRECATED
  sentEmailAt: null,
  shipmentTrackingId: null,
  shipmentTrackingEventId: null,
  stageId: null,
  taskId: null,
  teamId: null,
};
