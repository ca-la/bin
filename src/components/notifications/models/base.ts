import { NotificationType } from '../domain-object';

/**
 * These base notification types are set to null so that in the notifications that inherit from
 * this, we don't have to specify the fields that need to be null
 */
export interface BaseNotificationRow {
  action_description: null; // DEPRECATED
  actor_user_id: string;
  annotation_id: null;
  canvas_id: null;
  collaborator_id: null;
  collection_id: null;
  comment_id: null;
  created_at: string;
  design_id: null;
  id: string;
  measurement_id: null;
  recipient_user_id: null;
  section_id: null; // DEPRECATED
  sent_email_at: string | null;
  stage_id: null;
  task_id: null;
  type: NotificationType;
}

export interface BaseNotification {
  actionDescription: null; // DEPRECATED
  actorUserId: string;
  annotationId: null;
  canvasId: null;
  collaboratorId: null;
  collectionId: null;
  commentId: null;
  createdAt: Date;
  designId: null;
  id: string;
  measurementId: null;
  recipientUserId: null;
  sectionId: null; // DEPRECATED
  sentEmailAt: Date | null;
  stageId: null;
  taskId: null;
  type: NotificationType;
}

export const templateNotification = {
  actionDescription: null, // DEPRECATED
  annotationId: null,
  canvasId: null,
  collaboratorId: null,
  collectionId: null,
  commentId: null,
  designId: null,
  measurementId: null,
  recipientUserId: null,
  sectionId: null, // DEPRECATED
  sentEmailAt: null,
  stageId: null,
  taskId: null
};
