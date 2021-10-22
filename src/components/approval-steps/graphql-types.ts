import { schemaToGraphQLType } from "../../apollo/published-types";
import { baseApprovalStepSchema } from "./types";

export const gtApprovalStep = schemaToGraphQLType(
  "ApprovalStep",
  baseApprovalStepSchema
);
