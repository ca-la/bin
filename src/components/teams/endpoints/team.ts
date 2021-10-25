import db from "../../../services/db";
import {
  GraphQLContextWithTeamAndUser,
  GraphQLEndpoint,
  NotFoundError,
} from "../../../apollo";
import {
  TeamAndEnvironmentParent,
  gtTeam,
  TeamAndEnvironment,
} from "./graphql-types";
import { standardDao } from "../dao";
import ResourceNotFoundError from "../../../errors/resource-not-found";
import filterError from "../../../services/filter-error";
import { TeamDb } from "../types";
import { Role as TeamUserRole } from "../../team-users/types";

type Result = TeamAndEnvironment["team"];

export const TeamEndpoint: GraphQLEndpoint<
  {},
  Result,
  GraphQLContextWithTeamAndUser<Result>,
  TeamAndEnvironmentParent
> = {
  endpointType: "TeamAndEnvironment",
  types: [gtTeam],
  name: "team",
  resolver: async (parent: TeamAndEnvironmentParent) => {
    const { teamId, teamUser } = parent;

    const team: TeamDb = await standardDao.findById(db, teamId).catch(
      filterError(ResourceNotFoundError, (err: ResourceNotFoundError) => {
        throw new NotFoundError(err.message);
      })
    );

    return {
      ...team,
      ...(teamUser
        ? { teamUserId: teamUser.id, role: teamUser.role }
        : { teamUserId: null, role: TeamUserRole.ADMIN }),
    };
  },
};
