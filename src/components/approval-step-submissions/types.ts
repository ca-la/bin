import * as z from "zod";
import {
  BaseNotification,
  BaseFullNotification,
} from "../notifications/models/base";
import { NotificationType } from "../notifications/types";

export enum ApprovalStepSubmissionArtifactType {
  TECHNICAL_DESIGN = "TECHNICAL_DESIGN",
  SAMPLE = "SAMPLE",
  CUSTOM = "CUSTOM",
}

export enum ApprovalStepSubmissionState {
  UNSUBMITTED = "UNSUBMITTED",
  SUBMITTED = "SUBMITTED",
  APPROVED = "APPROVED",
  REVISION_REQUESTED = "REVISION_REQUESTED",
  SKIPPED = "SKIPPED",
}

export default interface ApprovalStepSubmission {
  id: string;
  stepId: string;
  createdAt: Date;
  createdBy: string | null;
  deletedAt: Date | null;
  artifactType: ApprovalStepSubmissionArtifactType;
  state: ApprovalStepSubmissionState;
  collaboratorId: string | null;
  teamUserId: string | null;
  title: string;
}

export interface ApprovalStepSubmissionRow {
  id: string;
  step_id: string;
  created_at: Date;
  created_by: string | null;
  deleted_at: Date | null;
  artifact_type: ApprovalStepSubmissionArtifactType;
  state: ApprovalStepSubmissionState;
  collaborator_id: string | null;
  team_user_id: string | null;
  title: string;
}

export const approvalStepSubmissionDomain = "ApprovalStepSubmission" as "ApprovalStepSubmission";

type Base = Omit<
  BaseNotification,
  | "collaboratorId"
  | "collectionId"
  | "designId"
  | "approvalSubmissionId"
  | "approvalStepId"
  | "recipientUserId"
  | "recipientCollaboratorId"
  | "recipientTeamUserId"
>;

export interface ApprovalStepSubmissionAssignmentNotification extends Base {
  collaboratorId: string | null;
  collectionId: string | null;
  designId: string;
  approvalStepId: string;
  approvalSubmissionId: string;
  recipientUserId: string | null;
  recipientCollaboratorId: string | null;
  recipientTeamUserId: string | null;
}

type BaseFull = Omit<
  BaseFullNotification & ApprovalStepSubmissionAssignmentNotification,
  "collectionTitle" | "designTitle"
>;

export interface FullApprovalStepSubmissionAssignmentNotification
  extends BaseFull {
  collectionTitle: string | null;
  designTitle: string | null;
  type: NotificationType.APPROVAL_STEP_SUBMISSION_ASSIGNMENT;
}

export const approvalStepSubmissionUpdateSchema = z
  .object({
    collaboratorId: z.string().nullable(),
    teamUserId: z.string().nullable(),
  })
  .partial();

export type ApprovalStepSubmissionUpdate = z.infer<
  typeof approvalStepSubmissionUpdateSchema
>;
