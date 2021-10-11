import {
  composeMiddleware,
  requireAuth,
  GraphQLContextAuthenticated,
  ForbiddenError,
  GraphQLEndpoint,
} from "../../../apollo";
import db from "../../../services/db";
import {
  gtCollection,
  gtCollectionFilter,
  CollectionFilter,
} from "./graphql-types";
import { Collection } from "../types";
import * as CollectionsDAO from "../dao";

interface FindArgs {
  filter: CollectionFilter;
  limit?: number;
  offset?: number;
}

type FindResult = Collection[];

export async function checkFilterUserId(
  args: FindArgs,
  context: GraphQLContextAuthenticated<FindResult>
) {
  const { session } = context;
  const { filter } = args;
  if (session.role !== "ADMIN" && filter.userId !== session.userId) {
    throw new ForbiddenError("Cannot access collections for this user");
  }
  return context;
}

export const findEndpoint: GraphQLEndpoint<
  FindArgs,
  FindResult,
  GraphQLContextAuthenticated<FindResult>
> = {
  endpointType: "Query",
  types: [gtCollection, gtCollectionFilter],
  name: "collections",
  signature: `(filter: CollectionFilter!, limit: Int = 20, offset: Int = 0): [Collection]`,
  middleware: composeMiddleware(requireAuth, checkFilterUserId),
  resolver: async (
    _parent: any,
    args: FindArgs,
    context: GraphQLContextAuthenticated<FindResult>
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
