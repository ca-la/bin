import ApprovalStepSubmission, {
  ApprovalStepSubmissionRow,
  domain,
} from "./types";
import { buildAdapter } from "../../services/cala-component/cala-adapter";

export default buildAdapter<ApprovalStepSubmission, ApprovalStepSubmissionRow>({
  domain,
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
