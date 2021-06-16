import uuid from "node-uuid";
import {
  GraphQLEndpoint,
  ForbiddenError,
  GraphQLContextBase,
  useRequireAuth,
  requireAuth,
  GraphQLContextAuthenticated,
  UserInputError,
  NotFoundError,
} from "../../apollo";
import * as GraphQLTypes from "./graphql-types";
import { Attachment } from "../assets/graphql-types";
import {
  extractDesignIdFromCommentParent,
  FindCommentsByIdOptions,
} from "./dao";
import { getDesignPermissions } from "../../services/get-permissions";
import { createCommentWithAttachments } from "../../services/create-comment-with-attachments";
import * as ApprovalStepService from "../approval-step-comments/service";
import * as AnnotationService from "../annotation-comments/service";
import {
  createCommentPaginationModifier,
  createCursor,
  Cursor,
  getNextPage,
  getPreviousPage,
  readCursor,
} from "../comments/cursor-service";
import Comment, { PaginatedComments } from "./types";
import { findByAnnotationId } from "../annotation-comments/dao";
import * as CommentsDAO from "../comments/dao";
import { transformMentionsToGraphQL } from "./service";

interface CreateCommentArgs {
  comment: GraphQLTypes.CommentInputType;
}

const createComment: GraphQLEndpoint<
  CreateCommentArgs,
  GraphQLTypes.CommentWithResourcesGraphQLType,
  GraphQLContextBase<GraphQLTypes.CommentWithResourcesGraphQLType>
> = {
  endpointType: "Mutation",
  types: [
    GraphQLTypes.CommentInput,
    GraphQLTypes.CommentWithResources,
    Attachment,
  ],
  name: "createComment",
  signature: `(comment: ${GraphQLTypes.CommentInput.name}): ${GraphQLTypes.CommentWithResources.name}`,
  resolver: async (
    _: unknown,
    args: CreateCommentArgs,
    context: GraphQLContextBase<GraphQLTypes.CommentWithResourcesGraphQLType>
  ) => {
    const { comment: input } = args;
    const { trx, session } = useRequireAuth(context);
    const { userId, role } = session;

    const designId = await extractDesignIdFromCommentParent(trx, {
      approvalStepId: input.approvalStepId,
      annotationId: input.annotationId,
    });
    const designPermissions = await getDesignPermissions({
      designId,
      sessionRole: role,
      sessionUserId: userId,
    });

    if (!designPermissions.canComment) {
      throw new ForbiddenError("Not authorized to comment on this design");
    }

    const comment = await createCommentWithAttachments(trx, {
      comment: {
        id: uuid.v4(),
        createdAt: new Date(),
        deletedAt: null,
        text: input.text,
        parentCommentId: input.parentCommentId,
        userId,
        isPinned: input.isPinned,
      },
      attachments: [],
      userId,
    });

    const commentWithResources = input.approvalStepId
      ? await ApprovalStepService.createAndAnnounce(
          trx,
          input.approvalStepId,
          comment
        )
      : input.annotationId
      ? await AnnotationService.createAndAnnounce(
          trx,
          input.annotationId,
          comment
        )
      : null;

    if (!commentWithResources) {
      // this should never happen
      // because extractDesignIdFromCommentInput makes sure that one of
      // approvalStepId or annotationId is set
      throw new Error("commentWithResources should not be empty");
    }

    return {
      ...commentWithResources,
      mentions: transformMentionsToGraphQL(commentWithResources.mentions),
    };
  },
};

interface GetCommentsArg {
  annotationId: string;
  approvalStepId: null;
  limit: number;
  nextCursor?: string;
  previousCursor?: string;
  parentCommentId?: string;
  commentId?: string;
}

const getComments: GraphQLEndpoint<any, any, any> = {
  endpointType: "Query",
  types: [
    GraphQLTypes.CommentWithResources,
    GraphQLTypes.PaginatedComments,
    Attachment,
  ],
  name: "comments",
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
      approvalStepId,
    }: GetCommentsArg,
    context: GraphQLContextAuthenticated<PaginatedComments>
  ) => {
    const { trx, session } = useRequireAuth(context);
    const { userId, role } = session;

    const designId = await extractDesignIdFromCommentParent(trx, {
      approvalStepId,
      annotationId,
    });
    const designPermissions = await getDesignPermissions({
      designId,
      sessionRole: role,
      sessionUserId: userId,
    });
    if (!designPermissions.canView) {
      throw new ForbiddenError(
        "Not authorized to view comments on this design"
      );
    }

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
    const sortOrder: "asc" | "desc" = nextCursor ? "asc" : "desc";

    const baseFindOptions: FindCommentsByIdOptions = {
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
    };

    const comments = await findByAnnotationId(trx, {
      annotationId,
      ...baseFindOptions,
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

export const CommentEndpoints = [getComments, createComment];
