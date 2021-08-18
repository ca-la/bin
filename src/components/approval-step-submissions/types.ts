import * as z from "zod";
import { serializedDates } from "../../services/zod-helpers";
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
export const approvalStepSubmissionArtifactTypeSchema = z.nativeEnum(
  ApprovalStepSubmissionArtifactType
);

export enum ApprovalStepSubmissionState {
  UNSUBMITTED = "UNSUBMITTED",
  SUBMITTED = "SUBMITTED",
  APPROVED = "APPROVED",
  REVISION_REQUESTED = "REVISION_REQUESTED",
  SKIPPED = "SKIPPED",
}
export const approvalStepSubmissionStateSchema = z.nativeEnum(
  ApprovalStepSubmissionState
);

export const approvalStepSubmissionSchema = z.object({
  id: z.string(),
  stepId: z.string(),
  createdAt: z.date(),
  createdBy: z.string().nullable(),
  deletedAt: z.date().nullable(),
  artifactType: approvalStepSubmissionArtifactTypeSchema,
  state: approvalStepSubmissionStateSchema,
  collaboratorId: z.string().nullable(),
  teamUserId: z.string().nullable(),
  title: z.string(),
});
export type ApprovalStepSubmission = z.infer<
  typeof approvalStepSubmissionSchema
>;
export default ApprovalStepSubmission;

export const approvalStepSubmissionRowSchema = z.object({
  id: approvalStepSubmissionSchema.shape.id,
  step_id: approvalStepSubmissionSchema.shape.stepId,
  created_at: approvalStepSubmissionSchema.shape.createdAt,
  created_by: approvalStepSubmissionSchema.shape.createdBy,
  deleted_at: approvalStepSubmissionSchema.shape.deletedAt,
  artifact_type: approvalStepSubmissionSchema.shape.artifactType,
  state: approvalStepSubmissionSchema.shape.state,
  collaborator_id: approvalStepSubmissionSchema.shape.collaboratorId,
  team_user_id: approvalStepSubmissionSchema.shape.teamUserId,
  title: approvalStepSubmissionSchema.shape.title,
});

export type ApprovalStepSubmissionRow = z.infer<
  typeof approvalStepSubmissionRowSchema
>;

export const serializedApprovalStepSubmissionSchema = approvalStepSubmissionSchema.extend(
  serializedDates
);

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
    state: z.union([
      z.literal(ApprovalStepSubmissionState.SUBMITTED),
      z.literal(ApprovalStepSubmissionState.UNSUBMITTED),
      z.literal(ApprovalStepSubmissionState.APPROVED),
    ]),
  })
  .partial();

export type ApprovalStepSubmissionUpdate = z.infer<
  typeof approvalStepSubmissionUpdateSchema
>;
