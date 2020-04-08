import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';

export enum ApprovalStepSubmissionArtifactType {
  TECHNICAL_DESIGN = 'TECHNICAL_DESIGN',
  SAMPLE = 'SAMPLE'
}

export enum ApprovalStepSubmissionState {
  UNSUBMITTED = 'UNSUBMITTED',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REVISION_REQUESTED = 'REVISION_REQUESTED',
  SKIPPED = 'SKIPPED'
}

export default interface ApprovalStepSubmission {
  id: string;
  stepId: string;
  createdAt: Date;
  artifactType: ApprovalStepSubmissionArtifactType;
  state: ApprovalStepSubmissionState;
}

export interface ApprovalStepSubmissionRow {
  id: string;
  step_id: string;
  created_at: Date;
  artifact_type: ApprovalStepSubmissionArtifactType;
  state: ApprovalStepSubmissionState;
}

export const dataAdapter = new DataAdapter<
  ApprovalStepSubmissionRow,
  ApprovalStepSubmission
>();

export function isApprovalStepSubmissionRow(
  candidate: any
): candidate is ApprovalStepSubmissionRow {
  return hasProperties(
    candidate,
    'id',
    'step_id',
    'created_at',
    'artifact_type',
    'state'
  );
}
