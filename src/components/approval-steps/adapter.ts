import { fromSchema } from "../../services/cala-component/cala-adapter";
import ApprovalStep, {
  ApprovalStepRow,
  approvalStepRowSchema,
  approvalStepSchema,
} from "./types";

export default fromSchema<ApprovalStep, ApprovalStepRow>({
  modelSchema: approvalStepSchema,
  rowSchema: approvalStepRowSchema,
});
