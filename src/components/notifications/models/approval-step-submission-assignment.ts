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
  | "approval_submission_id"
  | "recipient_user_id"
>;

export interface ApprovalStepSubmissionAssignmentNotificationRow
  extends BaseRow {
  collection_id: string | null;
  design_id: string;
  approval_step_id: string;
  approval_submission_id: string;
  collaborator_id: string;
  recipient_user_id: string;
  type: NotificationType.APPROVAL_STEP_SUBMISSION_ASSIGNMENT;
}

type BaseFullRow = Omit<
  BaseFullNotificationRow & ApprovalStepSubmissionAssignmentNotificationRow,
  | "collection_title"
  | "design_title"
  | "approval_step_title"
  | "approval_submission_title"
>;

export interface FullApprovalStepSubmissionAssignmentNotificationRow
  extends BaseFullRow {
  collection_title: string | null;
  design_title: string | null;
  approval_step_title: string;
  approval_submission_title: string;
}

type Base = Omit<
  BaseNotification,
  | "collectionId"
  | "designId"
  | "approvalStepId"
  | "approvalSubmissionId"
  | "recipientUserId"
>;

export interface ApprovalStepSubmissionAssignmentNotification extends Base {
  collectionId: string | null;
  designId: string;
  approvalStepId: string;
  approvalSubmissionId: string;
  recipientUserId: string;
  type: NotificationType.APPROVAL_STEP_SUBMISSION_ASSIGNMENT;
}

type BaseFull = Omit<
  BaseFullNotification & ApprovalStepSubmissionAssignmentNotification,
  | "collectionTitle"
  | "designTitle"
  | "approvalStepTitle"
  | "approvalSubmissionTitle"
>;

export interface FullApprovalStepSubmissionAssignmentNotification
  extends BaseFull {
  collectionTitle: string | null;
  designTitle: string | null;
  approvalStepTitle: string;
  approvalSubmissionTitle: string;
}

export function isApprovalStepSubmissionAssignmentNotification(
  candidate: any
): candidate is ApprovalStepSubmissionAssignmentNotification {
  return (
    candidate.type === NotificationType.APPROVAL_STEP_SUBMISSION_ASSIGNMENT
  );
}
