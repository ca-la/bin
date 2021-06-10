import {
  GraphQLContextAuthenticated,
  GraphQLEndpoint,
  NotFoundError,
  requireAuth,
  UserInputError,
} from "../../apollo";
import * as CommentsGraphQLTypes from "../comments/graphql-types";
import * as AssetsGraphQLTypes from "../assets/graphql-types";
import Comment, { PaginatedComments } from "../comments/types";
import * as CommentsDAO from "../comments/dao";
import {
  createCommentPaginationModifier,
  createCursor,
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
  commentId?: string;
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
      parentCommentId: String,
      commentId: String
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
      commentId,
    }: GetAnnotationCommentsArg,
    context: GraphQLContextAuthenticated<PaginatedComments>
  ) => {
    const { trx } = context;

    if (limit && limit < 0) {
      throw new UserInputError("Limit cannot be negative!");
    }

    let comment: Comment | null;
    comment = commentId ? await CommentsDAO.findById(commentId) : null;
    if (commentId && !comment) {
      throw new NotFoundError(`Could not find comment ${commentId}`);
    }

    let cursor: Cursor | null;
    try {
      cursor = comment
        ? { id: comment.id, createdAt: comment.createdAt }
        : nextCursor
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
      // Prev (desc) is exclusive of the cursor createdAt time
      // Next (asc) is inclusive of the cursor createdAt time
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
      currentCursor: comment
        ? createCursor({ id: comment.id, createdAt: comment.createdAt })
        : previousCursor,
    });
  },
};

export const ProductDesignCanvasAnnotationEndpoints = [annotationComments];
