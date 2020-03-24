import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';

export interface BaseApprovalStep {
  id: string;
  title: string;
  ordering: number;
  designId: string;
}

export enum ApprovalStepState {
  BLOCKED = 'BLOCKED',
  UNSTARTED = 'UNSTARTED',
  CURRENT = 'CURRENT',
  COMPLETED = 'COMPLETED',
  SKIP = 'SKIP'
}

export interface ApprovalBlocked extends BaseApprovalStep {
  state: ApprovalStepState.BLOCKED;
}

export interface ApprovalUnstarted extends BaseApprovalStep {
  state: ApprovalStepState.UNSTARTED;
}

export interface ApprovalCurrent extends BaseApprovalStep {
  state: ApprovalStepState.CURRENT;
}

export interface ApprovalCompleted extends BaseApprovalStep {
  state: ApprovalStepState.COMPLETED;
}

export interface ApprovalSkip extends BaseApprovalStep {
  state: ApprovalStepState.SKIP;
}

type ApprovalStep =
  | ApprovalBlocked
  | ApprovalUnstarted
  | ApprovalCurrent
  | ApprovalCompleted
  | ApprovalSkip;

export default ApprovalStep;

export interface ApprovalStepRow {
  id: string;
  title: string;
  ordering: number;
  design_id: string;
  state: string;
}

export const dataAdapter = new DataAdapter<ApprovalStepRow, ApprovalStep>();

export function isApprovalStepRow(
  candidate: any
): candidate is ApprovalStepRow {
  return hasProperties(
    candidate,
    'id',
    'title',
    'ordering',
    'design_id',
    'state'
  );
}
