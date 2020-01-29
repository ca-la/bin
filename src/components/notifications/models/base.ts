import { NotificationType } from '../domain-object';
import User from '../../users/domain-object';

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
  deleted_at: string | null;
  design_id: null;
  id: string;
  measurement_id: null;
  read_at: string | null;
  recipient_user_id: null;
  section_id: null; // DEPRECATED
  sent_email_at: string | null;
  stage_id: null;
  task_id: null;
  type: NotificationType;
}

export interface BaseFullNotificationRow {
  actor: User;
  comment_text: null;
  component_type: null;
  collection_title: null;
  design_title: null;
  design_image_ids: string[];
  task_title: null;
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
  deletedAt: Date | null;
  designId: null;
  id: string;
  measurementId: null;
  readAt: Date | null;
  recipientUserId: null;
  sectionId: null; // DEPRECATED
  sentEmailAt: Date | null;
  stageId: null;
  taskId: null;
  type: NotificationType;
}

export interface BaseFullNotification {
  actor: User;
  commentText: null;
  componentType: null;
  collectionTitle: null;
  designTitle: null;
  designImageIds: string[];
  taskTitle: null;
}

export const templateNotification = {
  actionDescription: null, // DEPRECATED
  annotationId: null,
  canvasId: null,
  collaboratorId: null,
  collectionId: null,
  commentId: null,
  deletedAt: null,
  designId: null,
  measurementId: null,
  readAt: null,
  recipientUserId: null,
  sectionId: null, // DEPRECATED
  sentEmailAt: null,
  stageId: null,
  taskId: null
};
