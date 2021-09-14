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

export const approvalStepSubmissionDbSchema = z.object({
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
  annotationId: z.string().nullable(),
});

export type ApprovalStepSubmissionDb = z.infer<
  typeof approvalStepSubmissionDbSchema
>;

export const approvalStepSubmissionSchema = approvalStepSubmissionDbSchema.extend(
  {
    commentCount: z.number(),
  }
);

export type ApprovalStepSubmission = z.infer<
  typeof approvalStepSubmissionSchema
>;

export default ApprovalStepSubmission;

export const approvalStepSubmissionDbRowSchema = z.object({
  id: approvalStepSubmissionDbSchema.shape.id,
  step_id: approvalStepSubmissionDbSchema.shape.stepId,
  created_at: approvalStepSubmissionDbSchema.shape.createdAt,
  created_by: approvalStepSubmissionDbSchema.shape.createdBy,
  deleted_at: approvalStepSubmissionDbSchema.shape.deletedAt,
  artifact_type: approvalStepSubmissionDbSchema.shape.artifactType,
  state: approvalStepSubmissionDbSchema.shape.state,
  collaborator_id: approvalStepSubmissionDbSchema.shape.collaboratorId,
  team_user_id: approvalStepSubmissionDbSchema.shape.teamUserId,
  title: approvalStepSubmissionDbSchema.shape.title,
  annotation_id: approvalStepSubmissionSchema.shape.annotationId,
});

export type ApprovalStepSubmissionDbRow = z.infer<
  typeof approvalStepSubmissionDbRowSchema
>;

export const approvalStepSubmissionRowSchema = approvalStepSubmissionDbRowSchema.extend(
  {
    comment_count: z
      .string()
      .refine(
        (maybeNumberString: string) =>
          Number.isSafeInteger(parseInt(maybeNumberString, 10)),
        "Comment count exceeds maximum safe integer"
      )
      .transform(parseInt),
  }
);

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
