import { ForbiddenError } from "apollo-server-koa";
import { GraphQLContextAuthenticated } from "./require-auth";
import TeamUsersDAO from "../../components/team-users/dao";
import { TeamUser } from "../../components/team-users/types";
import db from "../../services/db";

export interface GraphQLContextWithTeam<Result>
  extends GraphQLContextAuthenticated<Result> {
  teamId: string;
}

export interface GraphQLContextWithTeamAndUser<Result>
  extends GraphQLContextWithTeam<Result> {
  teamUser: TeamUser | null;
}

export async function attachTeamFromTeamId<
  Args extends { teamId: string },
  Result
>(
  args: Args,
  context: GraphQLContextAuthenticated<Result>
): Promise<GraphQLContextWithTeam<Result>> {
  return {
    ...context,
    teamId: args.teamId,
  };
}

export async function attachTeamUserOrRequireAdmin<Args, Result>(
  _: Args,
  context: GraphQLContextWithTeam<Result>
): Promise<GraphQLContextWithTeamAndUser<Result>> {
  const {
    teamId,
    session: { userId, role },
  } = context;
  const teamUser = await TeamUsersDAO.findByUserAndTeam(db, {
    userId,
    userEmail: null,
    teamId,
  });

  if (!teamUser && role !== "ADMIN") {
    throw new ForbiddenError("Not authorized to view this team");
  }

  return {
    ...context,
    teamUser: teamUser || null,
  };
}
