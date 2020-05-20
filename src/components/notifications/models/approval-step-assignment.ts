import {
  BaseFullNotification,
  BaseFullNotificationRow,
  BaseNotification,
  BaseNotificationRow,
} from "./base";
import { NotificationType } from "../domain-object";

type BaseRow = Omit<
  BaseNotificationRow,
  | "collaborator_id"
  | "collection_id"
  | "design_id"
  | "approval_step_id"
  | "recipient_user_id"
>;

export interface ApprovalStepAssignmentNotificationRow extends BaseRow {
  collection_id: string | null;
  design_id: string;
  approval_step_id: string;
  collaborator_id: string;
  recipient_user_id: string;
  type: NotificationType.APPROVAL_STEP_SUBMISSION_ASSIGNMENT;
}

type BaseFullRow = Omit<
  BaseFullNotificationRow & ApprovalStepAssignmentNotificationRow,
  "collection_title" | "design_title" | "approval_step_title"
>;

export interface FullApprovalStepAssignmentNotificationRow extends BaseFullRow {
  collection_title: string | null;
  design_title: string | null;
  approval_step_title: string;
}

type Base = Omit<
  BaseNotification,
  "collectionId" | "designId" | "approvalStepId" | "recipientUserId"
>;

export interface ApprovalStepAssignmentNotification extends Base {
  collectionId: string | null;
  designId: string;
  approvalStepId: string;
  recipientUserId: string;
  type: NotificationType.APPROVAL_STEP_ASSIGNMENT;
}

type BaseFull = Omit<
  BaseFullNotification & ApprovalStepAssignmentNotification,
  "collectionTitle" | "designTitle" | "approvalStepTitle"
>;

export interface FullApprovalStepAssignmentNotification extends BaseFull {
  collectionTitle: string | null;
  designTitle: string | null;
  approvalStepTitle: string;
}

export function isApprovalStepAssignmentNotification(
  candidate: any
): candidate is ApprovalStepAssignmentNotification {
  return candidate.type === NotificationType.APPROVAL_STEP_ASSIGNMENT;
}
