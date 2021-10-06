import {
  composeMiddleware,
  requireAuth,
  GraphQLContextAuthenticated,
  ForbiddenError,
  GraphQLEndpoint,
} from "../../apollo";
import db from "../../services/db";
import {
  gtCollection,
  gtCollectionFilter,
  CollectionFilter,
} from "./graphql-types";
import { Collection } from "./types";
import * as CollectionsDAO from "./dao";

interface Args {
  filter: CollectionFilter;
  limit?: number;
  offset?: number;
}

type Result = Collection[];

export async function checkFilterUserId(
  args: Args,
  context: GraphQLContextAuthenticated<Result>
) {
  const { session } = context;
  const { filter } = args;
  if (session.role !== "ADMIN" && filter.userId !== session.userId) {
    throw new ForbiddenError("Cannot access collections for this user");
  }
  return context;
}

const findEndpoint: GraphQLEndpoint<
  Args,
  Result,
  GraphQLContextAuthenticated<Result>
> = {
  endpointType: "Query",
  types: [gtCollection, gtCollectionFilter],
  name: "collections",
  signature: `(filter: CollectionFilter!, limit: Int = 20, offset: Int = 0): [Collection]`,
  middleware: composeMiddleware(requireAuth, checkFilterUserId),
  resolver: async (
    _parent: any,
    args: Args,
    context: GraphQLContextAuthenticated<Result>
  ) => {
    const { session } = context;
    const { limit, offset, filter } = args;

    return CollectionsDAO.findByUser(db, {
      userId: filter.userId,
      limit,
      offset,
      sessionRole: session.role,
    });
  },
};

export const CollectionEndpoints = [findEndpoint];
