import { Transaction } from "knex";
import {
  requireAuth,
  GraphQLContextWithTeamAndUser,
  GraphQLEndpoint,
  composeMiddleware,
  attachTeamFromTeamId,
  attachTeamUserOrRequireAdmin,
  requireTeamAdminOrOwner,
} from "../../../apollo";
import db from "../../../services/db";
import { gtTeamDb } from "./graphql-types";
import { TeamDb } from "../types";
import TeamsDAO from "../dao";

interface DeleteArgs {
  teamId: string;
}

export const DeleteEndpoint: GraphQLEndpoint<
  DeleteArgs,
  TeamDb | null,
  GraphQLContextWithTeamAndUser<TeamDb | null>
> = {
  endpointType: "Mutation",
  types: [gtTeamDb],
  name: "deleteTeam",
  signature: `(teamId: String!): TeamDb`,
  middleware: composeMiddleware(
    requireAuth,
    attachTeamFromTeamId,
    attachTeamUserOrRequireAdmin,
    requireTeamAdminOrOwner
  ),
  resolver: async (_parent: any, args: DeleteArgs) => {
    const { teamId } = args;

    return db.transaction(async (trx: Transaction) => {
      return TeamsDAO.deleteById(trx, teamId);
    });
  },
};
