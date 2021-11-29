import { schemaToGraphQLType } from "../../apollo/published-types";
import { planStripePriceSchema } from "./types";

export const gtPlanStripePrice = schemaToGraphQLType(
  "PlanStripePrice",
  planStripePriceSchema
);
