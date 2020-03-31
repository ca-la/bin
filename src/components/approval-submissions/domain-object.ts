import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';

export enum ApprovalSubmissionArtifactType {
  TECHNICAL_DESIGN = 'TECHNICAL_DESIGN',
  SAMPLE = 'SAMPLE'
}

export enum ApprovalSubmissionState {
  UNSUBMITTED = 'UNSUBMITTED',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REVISION_REQUESTED = 'REVISION_REQUESTED',
  SKIPPED = 'SKIPPED'
}

export default interface ApprovalSubmission {
  id: string;
  stepId: string;
  createdAt: Date;
  artifactType: ApprovalSubmissionArtifactType;
  state: ApprovalSubmissionState;
}

export interface ApprovalSubmissionRow {
  id: string;
  step_id: string;
  created_at: Date;
  artifact_type: ApprovalSubmissionArtifactType;
  state: ApprovalSubmissionState;
}

export const dataAdapter = new DataAdapter<
  ApprovalSubmissionRow,
  ApprovalSubmission
>();

export function isApprovalSubmissionRow(
  candidate: any
): candidate is ApprovalSubmissionRow {
  return hasProperties(
    candidate,
    'id',
    'step_id',
    'created_at',
    'artifact_type',
    'state'
  );
}
