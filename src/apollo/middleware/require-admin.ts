import { GraphQLContextAuthenticated } from "./require-auth";

export async function requireAdmin<Args>(
  _: Args,
  context: GraphQLContextAuthenticated
): Promise<GraphQLContextAuthenticated> {
  const { session } = context;

  if (session.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  return context;
}
