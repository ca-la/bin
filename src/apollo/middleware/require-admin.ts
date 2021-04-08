import { ForbiddenError } from "apollo-server-koa";
import { GraphQLContextAuthenticated } from "./require-auth";

export async function requireAdmin<Args, Result>(
  _: Args,
  context: GraphQLContextAuthenticated<Result>
): Promise<GraphQLContextAuthenticated<Result>> {
  const { session } = context;

  if (session.role !== "ADMIN") {
    throw new ForbiddenError("Unauthorized");
  }

  return context;
}
