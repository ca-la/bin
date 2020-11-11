export interface BaseApprovalStep {
  id: string;
  title: string;
  ordering: number;
  designId: string;
  collaboratorId: string | null;
  teamUserId: string | null;
  type: ApprovalStepType;
  createdAt: Date;
  completedAt: Date | null;
  startedAt: Date | null;
  dueAt: Date | null;
}

export enum ApprovalStepState {
  BLOCKED = "BLOCKED",
  UNSTARTED = "UNSTARTED",
  CURRENT = "CURRENT",
  COMPLETED = "COMPLETED",
  SKIP = "SKIP",
}

export enum ApprovalStepType {
  CHECKOUT = "CHECKOUT",
  TECHNICAL_DESIGN = "TECHNICAL_DESIGN",
  SAMPLE = "SAMPLE",
  PRODUCTION = "PRODUCTION",
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
  collaborator_id: string | null;
  team_user_id: string | null;
  state: string;
  reason: string | null;
  type: string;
  created_at: Date;
  completed_at: Date | null;
  started_at: Date | null;
  due_at: Date | null;
}

export const approvalStepDomain = "ApprovalStep" as "ApprovalStep";
