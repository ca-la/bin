import {
  GraphQLContextAuthenticated,
  GraphQLEndpoint,
  requireAuth,
  UserInputError,
} from "../../apollo";
import * as CommentsGraphQLTypes from "../comments/graphql-types";
import * as AssetsGraphQLTypes from "../assets/graphql-types";
import { PaginatedComments } from "../comments/types";
import {
  createCommentPaginationModifier,
  Cursor,
  getNextPage,
  getPreviousPage,
  readCursor,
} from "../comments/cursor-service";
import { findByAnnotationId } from "../annotation-comments/dao";

interface GetAnnotationCommentsArg {
  annotationId: string;
  limit: number;
  nextCursor?: string;
  previousCursor?: string;
  parentCommentId?: string;
}

const annotationComments: GraphQLEndpoint<any, any, any> = {
  endpointType: "Query",
  types: [
    CommentsGraphQLTypes.CommentWithResources,
    CommentsGraphQLTypes.PaginatedComments,
    AssetsGraphQLTypes.Attachment,
  ],
  name: "annotationComments",
  signature: `(
      annotationId: String!,
      limit: Int!,
      nextCursor: String,
      previousCursor: String,
      parentCommentId: String
    ): PaginatedComments`,
  middleware: requireAuth,
  resolver: async (
    _: unknown,
    {
      annotationId,
      limit,
      previousCursor,
      nextCursor,
      parentCommentId,
    }: GetAnnotationCommentsArg,
    context: GraphQLContextAuthenticated<PaginatedComments>
  ) => {
    const { trx } = context;

    if (limit && limit < 0) {
      throw new UserInputError("Limit cannot be negative!");
    }

    let cursor: Cursor | null;
    try {
      cursor = nextCursor
        ? readCursor(nextCursor)
        : previousCursor
        ? readCursor(previousCursor)
        : null;
    } catch (err) {
      throw new UserInputError("Invalid cursor");
    }
    const sortOrder = nextCursor ? "asc" : "desc";

    const comments = await findByAnnotationId(trx, {
      annotationId,
      // Prev (desc) is exclusive of the cursor create at time
      // Next (asc) is inclusive of the cursor created at time
      // An extra row must be fetched to correctly determine the next cursor value
      limit: limit + (sortOrder === "asc" ? 2 : 1),
      sortOrder,
      modify: createCommentPaginationModifier({
        cursor,
        sortOrder,
        parentCommentId: parentCommentId || null,
      }),
    });

    if (nextCursor) {
      return getNextPage({
        trx,
        comments,
        limit,
        currentCursor: nextCursor,
      });
    }

    return getPreviousPage({
      trx,
      comments,
      limit,
      currentCursor: previousCursor,
    });
  },
};

export const ProductDesignCanvasAnnotationEndpoints = [annotationComments];
