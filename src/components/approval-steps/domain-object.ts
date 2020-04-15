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

function encode(row: ApprovalStepRow): ApprovalStep {
  return {
    id: row.id,
    title: row.title,
    ordering: row.ordering,
    designId: row.design_id,
    state: row.state as ApprovalStepState
  };
}

function decode(step: ApprovalStep): ApprovalStepRow {
  return {
    id: step.id,
    title: step.title,
    ordering: step.ordering,
    design_id: step.designId,
    state: step.state
  };
}

export const dataAdapter = new DataAdapter<ApprovalStepRow, ApprovalStep>(
  encode,
  decode
);

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
