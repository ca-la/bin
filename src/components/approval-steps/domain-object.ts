import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';

export interface BaseApprovalStep {
  id: string;
  title: string;
  ordering: number;
  designId: string;
  type: ApprovalStepType;
}

export enum ApprovalStepState {
  BLOCKED = 'BLOCKED',
  UNSTARTED = 'UNSTARTED',
  CURRENT = 'CURRENT',
  COMPLETED = 'COMPLETED',
  SKIP = 'SKIP'
}

export enum ApprovalStepType {
  CHECKOUT = 'CHECKOUT',
  TECHNICAL_DESIGN = 'TECHNICAL_DESIGN',
  SAMPLE = 'SAMPLE',
  PRODUCTION = 'PRODUCTION'
}

export interface ApprovalBlocked extends BaseApprovalStep {
  state: ApprovalStepState.BLOCKED;
  reason: string;
}

export interface ApprovalUnstarted extends BaseApprovalStep {
  state: ApprovalStepState.UNSTARTED;
  reason: null;
}

export interface ApprovalCurrent extends BaseApprovalStep {
  state: ApprovalStepState.CURRENT;
  reason: null;
}

export interface ApprovalCompleted extends BaseApprovalStep {
  state: ApprovalStepState.COMPLETED;
  reason: null;
}

export interface ApprovalSkip extends BaseApprovalStep {
  state: ApprovalStepState.SKIP;
  reason: null;
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
  reason: string | null;
  type: string;
}

function encode(row: ApprovalStepRow): ApprovalStep {
  switch (row.state as ApprovalStepState) {
    case ApprovalStepState.BLOCKED: {
      if (row.reason === null) {
        throw new Error(
          `Cannot find reason for blocked step with ID ${row.id}`
        );
      }

      return {
        id: row.id,
        title: row.title,
        ordering: row.ordering,
        designId: row.design_id,
        state: row.state as ApprovalStepState,
        reason: row.reason,
        type: row.type as ApprovalStepType
      } as ApprovalBlocked;
    }

    case ApprovalStepState.COMPLETED:
    case ApprovalStepState.CURRENT:
    case ApprovalStepState.UNSTARTED:
    case ApprovalStepState.SKIP: {
      if (row.reason !== null) {
        throw new Error(`Found a reason for unblocked step with ID ${row.id}`);
      }

      return {
        id: row.id,
        title: row.title,
        ordering: row.ordering,
        designId: row.design_id,
        state: row.state as ApprovalStepState,
        reason: null,
        type: row.type as ApprovalStepType
      } as
        | ApprovalUnstarted
        | ApprovalCurrent
        | ApprovalCompleted
        | ApprovalSkip;
    }

    default: {
      throw new TypeError(
        `Cannot map approval step row to valid domain model with ID ${row.id}`
      );
    }
  }
}

function decode(step: ApprovalStep): ApprovalStepRow {
  return {
    id: step.id,
    title: step.title,
    ordering: step.ordering,
    design_id: step.designId,
    state: step.state,
    reason: step.reason,
    type: step.type
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
    'state',
    'type'
  );
}
