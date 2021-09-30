import db from "../../../services/db";
import {
  GraphQLContextWithTeamAndUser,
  GraphQLEndpoint,
} from "../../../apollo";
import { TeamAndEnvironmentParent, TeamAndEnvironment } from "./graphql-types";
import { gtCollection } from "../../collections";
import { Role as TeamUserRole } from "../../team-users/types";
import * as CollectionsDAO from "../../collections/dao";

interface CollectionsArgs {
  limit?: number;
  offset?: number;
}

type Result = TeamAndEnvironment["collections"];

export const CollectionsEndpoint: GraphQLEndpoint<
  CollectionsArgs,
  Result,
  GraphQLContextWithTeamAndUser<Result>,
  TeamAndEnvironmentParent
> = {
  endpointType: "TeamAndEnvironment",
  types: [gtCollection],
  name: "collections",
  signature: `(limit: Int, offset: Int): [Collection]`,
  resolver: async (
    parent: TeamAndEnvironmentParent,
    args: CollectionsArgs,
    context: GraphQLContextWithTeamAndUser<Result>
  ) => {
    const { teamId } = parent;
    const { teamUser } = context;
    const { limit, offset } = args;

    // The attachTeamUserOrRequireAdmin middleware
    // puts null into the context.teamUser for CALA admin sessions
    const teamUserRole = teamUser ? teamUser.role : TeamUserRole.ADMIN;

    return CollectionsDAO.findByTeamWithPermissionsByRole(
      db,
      teamId,
      teamUserRole,
      { limit, offset }
    );
  },
};
