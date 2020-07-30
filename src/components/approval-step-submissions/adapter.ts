import ApprovalStepSubmission, {
  ApprovalStepSubmissionRow,
  approvalStepSubmissionDomain,
} from "./types";
import { buildAdapter } from "../../services/cala-component/cala-adapter";

export default buildAdapter<ApprovalStepSubmission, ApprovalStepSubmissionRow>({
  domain: approvalStepSubmissionDomain,
  requiredProperties: [
    "id",
    "stepId",
    "createdAt",
    "artifactType",
    "state",
    "collaboratorId",
    "title",
  ],
});
