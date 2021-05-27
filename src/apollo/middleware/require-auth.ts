import { AuthenticationError } from "apollo-server-koa";
import { TrackingEvent } from "../../middleware/tracking";
import { GraphQLContextBase } from "../types";

export interface PublicState {
  tracking: TrackingEvent[];
  trackingId: string;
}

export interface AuthedState extends PublicState {
  userId: string;
  role: string;
  token: string;
}

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

export function useRequireAuth<T>(
  context: GraphQLContextBase<T>
): GraphQLContextAuthenticated<T> {
  if (!isAuthedContext(context)) {
    throw new AuthenticationError("Unauthorized");
  }

  return context;
}
