import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';

export interface BaseApprovalStep {
  id: string;
  title: string;
  ordering: number;
  designId: string;
  type: ApprovalStepType;
  createdAt: Date;
  completedAt: Date | null;
  startedAt: Date | null;
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
  completedAt: null;
  startedAt: null;
}

export interface ApprovalUnstarted extends BaseApprovalStep {
  state: ApprovalStepState.UNSTARTED;
  reason: null;
  completedAt: null;
  startedAt: null;
}

export interface ApprovalCurrent extends BaseApprovalStep {
  state: ApprovalStepState.CURRENT;
  reason: null;
  startedAt: Date;
  completedAt: null;
}

export interface ApprovalCompleted extends BaseApprovalStep {
  state: ApprovalStepState.COMPLETED;
  reason: null;
  completedAt: Date;
  startedAt: Date;
}

export interface ApprovalSkip extends BaseApprovalStep {
  state: ApprovalStepState.SKIP;
  reason: null;
  completedAt: null;
  startedAt: null;
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
  created_at: Date;
  completed_at: Date | null;
  started_at: Date | null;
}

function encode(row: ApprovalStepRow): ApprovalStep {
  switch (row.state as ApprovalStepState) {
    case ApprovalStepState.BLOCKED: {
      if (row.reason === null) {
        throw new Error(
          `Cannot find reason for blocked step with ID ${row.id}`
        );
      }
      const step: ApprovalBlocked = {
        id: row.id,
        title: row.title,
        ordering: row.ordering,
        designId: row.design_id,
        state: ApprovalStepState.BLOCKED,
        reason: row.reason,
        type: row.type as ApprovalStepType,
        createdAt: row.created_at,
        completedAt: null,
        startedAt: null
      };

      return step;
    }

    case ApprovalStepState.COMPLETED: {
      if (row.reason !== null) {
        throw new Error(`Found a reason for unblocked step with ID ${row.id}`);
      }
      if (row.started_at === null) {
        throw new Error(`Completed step with ID ${row.id} has no start date`);
      }
      if (row.completed_at === null) {
        throw new Error(
          `Completed step with ID ${row.id} has no completed date`
        );
      }

      const step: ApprovalCompleted = {
        id: row.id,
        title: row.title,
        ordering: row.ordering,
        designId: row.design_id,
        state: ApprovalStepState.COMPLETED,
        reason: null,
        type: row.type as ApprovalStepType,
        createdAt: row.created_at,
        completedAt: row.completed_at,
        startedAt: row.started_at
      };

      return step;
    }

    case ApprovalStepState.CURRENT: {
      if (row.reason !== null) {
        throw new Error(`Found a reason for unblocked step with ID ${row.id}`);
      }
      if (row.started_at === null) {
        throw new Error(`Current step with ID ${row.id} has no start date`);
      }

      const step: ApprovalCurrent = {
        id: row.id,
        title: row.title,
        ordering: row.ordering,
        designId: row.design_id,
        state: ApprovalStepState.CURRENT,
        reason: null,
        type: row.type as ApprovalStepType,
        createdAt: row.created_at,
        completedAt: null,
        startedAt: row.started_at
      };

      return step;
    }

    case ApprovalStepState.UNSTARTED: {
      if (row.reason !== null) {
        throw new Error(`Found a reason for unblocked step with ID ${row.id}`);
      }

      const step: ApprovalUnstarted = {
        id: row.id,
        title: row.title,
        ordering: row.ordering,
        designId: row.design_id,
        state: ApprovalStepState.UNSTARTED,
        reason: null,
        type: row.type as ApprovalStepType,
        createdAt: row.created_at,
        completedAt: null,
        startedAt: null
      };

      return step;
    }
    case ApprovalStepState.SKIP: {
      if (row.reason !== null) {
        throw new Error(`Found a reason for unblocked step with ID ${row.id}`);
      }

      const step: ApprovalSkip = {
        id: row.id,
        title: row.title,
        ordering: row.ordering,
        designId: row.design_id,
        state: ApprovalStepState.SKIP,
        reason: null,
        type: row.type as ApprovalStepType,
        createdAt: row.created_at,
        completedAt: null,
        startedAt: null
      };

      return step;
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
    type: step.type,
    created_at: step.createdAt,
    completed_at: step.completedAt,
    started_at: step.startedAt
  };
}

export const dataAdapter = new DataAdapter<ApprovalStepRow, ApprovalStep>(
  encode,
  decode
);

export const partialDataAdapter = new DataAdapter<
  Partial<ApprovalStepRow>,
  Partial<ApprovalStep>
>();

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
