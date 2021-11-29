import db from "../../../services/db";
import {
  GraphQLContextWithTeamAndUser,
  GraphQLEndpoint,
} from "../../../apollo";
import { TeamAndEnvironmentParent, TeamAndEnvironment } from "./graphql-types";
import { gtSubscriptionWithPlan } from "../../subscriptions";
import * as SubscriptionsDAO from "../../subscriptions/dao";

type Result = TeamAndEnvironment["subscriptions"];

export const SubscriptionsEndpoint: GraphQLEndpoint<
  {},
  Result,
  GraphQLContextWithTeamAndUser<Result>,
  TeamAndEnvironmentParent
> = {
  endpointType: "TeamAndEnvironment",
  types: [gtSubscriptionWithPlan],
  name: "subscriptions",
  signature: `: [SubscriptionWithPlan]`,
  resolver: async (parent: TeamAndEnvironmentParent) => {
    const { teamId } = parent;
    return SubscriptionsDAO.findForTeamWithPlans(db, teamId, {
      isActive: true,
    });
  },
};
