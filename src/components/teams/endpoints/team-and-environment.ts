import {
  requireAuth,
  composeMiddleware,
  attachTeamFromTeamId,
  attachTeamUserOrRequireAdmin,
  GraphQLContextWithTeamAndUser,
  GraphQLEndpoint,
} from "../../../apollo";
import {
  gtTeamAndEnvironment,
  gtTeam,
  TeamAndEnvironmentParent,
} from "./graphql-types";
import { gtTeamUser, gtTeamUserRole } from "../../team-users/graphql-types";
import { gtUser, gtRole } from "../../users/graphql-types";
import { gtCollection } from "../../collections";
import { gtPermissions } from "../../permissions/graphql-types";

interface TeamAndEnvironmentArgs {
  teamId: string;
}

export const TeamAndEnvironmentEndpoint: GraphQLEndpoint<
  TeamAndEnvironmentArgs,
  TeamAndEnvironmentParent,
  GraphQLContextWithTeamAndUser<TeamAndEnvironmentParent>
> = {
  endpointType: "Query",
  types: [
    gtTeam,
    gtTeamUser,
    gtTeamUserRole,
    gtUser,
    gtRole,
    gtPermissions,
    gtCollection,
    gtTeamAndEnvironment,
  ],
  name: "TeamAndEnvironment",
  signature: `(teamId: String): TeamAndEnvironment`,
  middleware: composeMiddleware(
    requireAuth,
    attachTeamFromTeamId,
    attachTeamUserOrRequireAdmin
  ),
  resolver: async (
    _: any,
    args: TeamAndEnvironmentArgs,
    ctx: GraphQLContextWithTeamAndUser<TeamAndEnvironmentParent>
  ) => {
    return {
      teamId: args.teamId,
      teamUser: ctx.teamUser,
    };
  },
};
