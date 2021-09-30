import db from "../../../services/db";
import {
  GraphQLContextBase,
  GraphQLEndpoint,
  NotFoundError,
} from "../../../apollo";
import {
  TeamAndEnvironmentParent,
  gtTeam,
  TeamAndEnvironment,
} from "./graphql-types";
import { withTeamUserMetaDao } from "../dao";
import ResourceNotFoundError from "../../../errors/resource-not-found";
import filterError from "../../../services/filter-error";

type Result = TeamAndEnvironment["team"];

export const TeamEndpoint: GraphQLEndpoint<
  {},
  Result,
  GraphQLContextBase<Result>,
  TeamAndEnvironmentParent
> = {
  endpointType: "TeamAndEnvironment",
  types: [gtTeam],
  name: "team",
  resolver: async (parent: TeamAndEnvironmentParent) => {
    const { teamId } = parent;
    return withTeamUserMetaDao.findById(db, teamId).catch(
      filterError(ResourceNotFoundError, (err: ResourceNotFoundError) => {
        throw new NotFoundError(err.message);
      })
    );
  },
};
