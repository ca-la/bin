import ProductDesign = require("./product-design");
import ApprovalStep from "../../approval-steps/domain-object";

export default interface ProductDesignWithApprovalSteps extends ProductDesign {
  approvalSteps: ApprovalStep[];
  progress: number | null;
  firstStepCreatedAt: Date | null;
  lastStepDueAt: Date | null;
}
