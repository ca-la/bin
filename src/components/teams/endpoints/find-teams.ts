import {
  buildFindEndpoint,
  composeMiddleware,
  FindResult,
  GraphQLContextBase,
  requireAuth,
  GraphQLContextAuthenticated,
  ForbiddenError,
} from "../../../apollo";
import { gtTeam, gtTeamList, gtTeamFilter, TeamFilter } from "./graphql-types";
import { teamSchema, Team } from "../types";
import { findForEndpoint, countForEndpoint } from "../dao";
import { CalaDao } from "../../../services/cala-component/types";

export async function checkFilterUserId<
  Args extends { filter: TeamFilter },
  Result
>(args: Args, context: GraphQLContextAuthenticated<Result>) {
  const { session } = context;
  const { filter } = args;
  if (session.role !== "ADMIN" && filter.userId !== session.userId) {
    throw new ForbiddenError("Cannot access teams for this user");
  }
  return context;
}

export const findTeamsEndpoint = buildFindEndpoint<
  Team,
  GraphQLContextBase<FindResult<Team>>,
  TeamFilter
>(
  "Team",
  teamSchema,
  {
    find: findForEndpoint,
    count: countForEndpoint,
  } as CalaDao<Team>,
  composeMiddleware(requireAuth, checkFilterUserId),
  {
    gtModelType: gtTeam,
    gtFilterType: gtTeamFilter,
    gtListType: gtTeamList,
    isFilterRequired: true,
  }
);
