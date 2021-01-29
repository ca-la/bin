import {
  buildFindEndpoint,
  requireAuth,
  composeMiddleware,
  attachDesignFromFilter,
  attachDesignPermissions,
  requireDesignViewPermissions,
} from "../../apollo";
import dao from "./dao";
import ApprovalStep, {
  approvalStepDomain,
  baseApprovalStepSchema,
} from "./types";

export const ApprovalStepEndpoints = [
  buildFindEndpoint<ApprovalStep>(
    approvalStepDomain,
    baseApprovalStepSchema,
    dao,
    composeMiddleware(
      requireAuth,
      attachDesignFromFilter,
      attachDesignPermissions,
      requireDesignViewPermissions
    ),
    {
      allowedFilterAttributes: ["designId"],
    }
  ),
];
