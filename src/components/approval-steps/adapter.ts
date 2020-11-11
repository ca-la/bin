import { buildAdapter } from "../../services/cala-component/cala-adapter";
import ApprovalStep, {
  approvalStepDomain,
  ApprovalStepRow,
  ApprovalBlocked,
  ApprovalCompleted,
  ApprovalCurrent,
  ApprovalSkip,
  ApprovalStepState,
  ApprovalStepType,
  ApprovalUnstarted,
} from "./types";

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
        collaboratorId: row.collaborator_id,
        teamUserId: row.team_user_id,
        state: ApprovalStepState.BLOCKED,
        reason: row.reason,
        type: row.type as ApprovalStepType,
        createdAt: row.created_at,
        completedAt: null,
        startedAt: null,
        dueAt: row.due_at,
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
        collaboratorId: row.collaborator_id,
        teamUserId: row.team_user_id,
        state: ApprovalStepState.COMPLETED,
        reason: null,
        type: row.type as ApprovalStepType,
        createdAt: row.created_at,
        completedAt: row.completed_at,
        startedAt: row.started_at,
        dueAt: row.due_at,
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
        collaboratorId: row.collaborator_id,
        teamUserId: row.team_user_id,
        state: ApprovalStepState.CURRENT,
        reason: null,
        type: row.type as ApprovalStepType,
        createdAt: row.created_at,
        completedAt: null,
        startedAt: row.started_at,
        dueAt: row.due_at,
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
        collaboratorId: row.collaborator_id,
        teamUserId: row.team_user_id,
        state: ApprovalStepState.UNSTARTED,
        reason: null,
        type: row.type as ApprovalStepType,
        createdAt: row.created_at,
        completedAt: null,
        startedAt: null,
        dueAt: row.due_at,
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
        collaboratorId: row.collaborator_id,
        teamUserId: row.team_user_id,
        state: ApprovalStepState.SKIP,
        reason: null,
        type: row.type as ApprovalStepType,
        createdAt: row.created_at,
        completedAt: null,
        startedAt: null,
        dueAt: row.due_at,
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
    collaborator_id: step.collaboratorId,
    team_user_id: step.teamUserId,
    state: step.state,
    reason: step.reason,
    type: step.type,
    created_at: step.createdAt,
    completed_at: step.completedAt,
    started_at: step.startedAt,
    due_at: step.dueAt,
  };
}

export default buildAdapter<ApprovalStep, ApprovalStepRow>({
  domain: approvalStepDomain,
  requiredProperties: [
    "id",
    "title",
    "ordering",
    "designId",
    "state",
    "type",
    "dueAt",
    "startedAt",
    "completedAt",
    "createdAt",
    "collaboratorId",
    "teamUserId",
  ],
  encodeTransformer: encode,
  decodeTransformer: decode,
});
