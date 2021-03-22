import { AuthenticationError } from "apollo-server-koa";
import { GraphQLContextBase } from "../types";

export interface GraphQLContextAuthenticated<Result>
  extends Omit<GraphQLContextBase<Result>, "session"> {
  session: AuthedState;
}

function isAuthedContext<Result>(
  candidate: GraphQLContextBase<Result>
): candidate is GraphQLContextAuthenticated<Result> {
  return Boolean(candidate.session);
}

export async function requireAuth<Args, Result>(
  _: Args,
  context: GraphQLContextBase<Result>
): Promise<GraphQLContextAuthenticated<Result>> {
  if (!isAuthedContext(context)) {
    throw new AuthenticationError("Unauthorized");
  }

  return context;
}
