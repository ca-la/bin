import { schemaToGraphQLType } from "../../apollo/published-types";
import { subscriptionWithPlanUncheckedSchema } from "./types";
import { gtPlan } from "../plans";

export const gtSubscriptionWithPlan = schemaToGraphQLType(
  "SubscriptionWithPlan",
  subscriptionWithPlanUncheckedSchema,
  {
    depTypes: {
      plan: gtPlan,
    },
  }
);
