import { buildAdapter } from "../../services/cala-component/cala-adapter";
import ApprovalStep, {
  ApprovalStepRow,
  ApprovalStepState,
  ApprovalStepType,
} from "./types";

function encode(row: ApprovalStepRow): ApprovalStep {
  return {
    collaboratorId: row.collaborator_id,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    designId: row.design_id,
    dueAt: row.due_at,
    id: row.id,
    ordering: row.ordering,
    reason: row.reason,
    startedAt: row.started_at,
    state: row.state as ApprovalStepState,
    teamUserId: row.team_user_id,
    title: row.title,
    type: row.type as ApprovalStepType,
  } as ApprovalStep;
}

function decode(data: ApprovalStep): ApprovalStepRow {
  return {
    collaborator_id: data.collaboratorId,
    completed_at: data.completedAt,
    created_at: data.createdAt,
    design_id: data.designId,
    due_at: data.dueAt,
    id: data.id,
    ordering: data.ordering,
    reason: data.reason,
    started_at: data.startedAt,
    state: data.state,
    team_user_id: data.teamUserId,
    title: data.title,
    type: data.type,
  };
}

export default buildAdapter<ApprovalStep, ApprovalStepRow>({
  domain: "ApprovalStep",
  requiredProperties: [],
  decodeTransformer: decode,
  encodeTransformer: encode,
});
