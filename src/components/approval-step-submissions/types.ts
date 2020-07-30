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
  artifactType: ApprovalStepSubmissionArtifactType;
  state: ApprovalStepSubmissionState;
  collaboratorId: string | null;
  title: string;
}

export interface ApprovalStepSubmissionRow {
  id: string;
  step_id: string;
  created_at: Date;
  artifact_type: ApprovalStepSubmissionArtifactType;
  state: ApprovalStepSubmissionState;
  collaborator_id: string | null;
  title: string;
}

export const approvalStepSubmissionDomain = "ApprovalStepSubmission" as "ApprovalStepSubmission";
