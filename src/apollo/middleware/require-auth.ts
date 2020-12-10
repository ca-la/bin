import { GraphQLContextBase } from "../types";

export interface GraphQLContextAuthenticated
  extends Omit<GraphQLContextBase, "session"> {
  session: AuthedState;
}

function isAuthedContext(
  candidate: GraphQLContextBase
): candidate is GraphQLContextAuthenticated {
  return Boolean(candidate.session);
}

export async function requireAuth<Args>(
  _: Args,
  context: GraphQLContextBase
): Promise<GraphQLContextAuthenticated> {
  if (!isAuthedContext(context)) {
    throw new Error("Unauthorized");
  }

  return context;
}
