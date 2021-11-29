import { schemaToGraphQLType } from "../../apollo/published-types";
import { planSchema } from "./types";
import { gtPlanStripePrice } from "../plan-stripe-price/graphql-types";

export const gtPlan = schemaToGraphQLType("Plan", planSchema, {
  depTypes: {
    stripePrices: gtPlanStripePrice,
  },
});
