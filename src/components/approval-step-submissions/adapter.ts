import ApprovalStepSubmission, {
  ApprovalStepSubmissionRow,
  approvalStepSubmissionDomain,
} from "./types";
import { buildAdapter } from "../../services/cala-component/cala-adapter";

function encode(row: ApprovalStepSubmissionRow): ApprovalStepSubmission {
  return {
    artifactType: row.artifact_type,
    collaboratorId: row.collaborator_id,
    createdAt: row.created_at,
    id: row.id,
    state: row.state,
    stepId: row.step_id,
    teamUserId: row.team_user_id,
    title: row.title,
  };
}

function decode(data: ApprovalStepSubmission): ApprovalStepSubmissionRow {
  return {
    artifact_type: data.artifactType,
    collaborator_id: data.collaboratorId,
    created_at: data.createdAt,
    id: data.id,
    state: data.state,
    step_id: data.stepId,
    team_user_id: data.teamUserId,
    title: data.title,
  };
}

export default buildAdapter<ApprovalStepSubmission, ApprovalStepSubmissionRow>({
  domain: approvalStepSubmissionDomain,
  requiredProperties: [
    "id",
    "stepId",
    "createdAt",
    "artifactType",
    "state",
    "collaboratorId",
    "teamUserId",
    "title",
  ],
  encodeTransformer: encode,
  decodeTransformer: decode,
});
