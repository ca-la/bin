import { Transaction } from "knex";
import {
  requireAuth,
  GraphQLContextAuthenticated,
  GraphQLEndpoint,
} from "../../../apollo";
import db from "../../../services/db";
import { gtTeam, TeamInput, gtTeamInput } from "./graphql-types";
import { Team } from "../types";
import { createTeamWithOwnerAndSubscription } from "../service";

interface CreateArgs {
  team: TeamInput;
}

export const CreateEndpoint: GraphQLEndpoint<
  CreateArgs,
  Team,
  GraphQLContextAuthenticated<Team>
> = {
  endpointType: "Mutation",
  types: [gtTeam, gtTeamInput],
  name: "createTeam",
  signature: `(team: TeamInput!): Team`,
  middleware: requireAuth,
  resolver: async (
    _parent: any,
    args: CreateArgs,
    context: GraphQLContextAuthenticated<Team>
  ) => {
    const { session } = context;
    const { team: input } = args;

    return db.transaction(async (trx: Transaction) => {
      return createTeamWithOwnerAndSubscription(trx, input, session.userId);
    });
  },
};
