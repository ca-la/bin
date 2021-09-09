import Knex from "knex";
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
  addCommentResources,
  createCommentPaginationModifier,
  createCursor,
  Cursor,
  getNextPage,
  getPreviousPage,
  readCursor,
} from "../comments/cursor-service";
import { BaseComment, PaginatedComments } from "./types";
import { findByAnnotationId } from "../annotation-comments/dao";
import * as CommentsDAO from "../comments/dao";
import { findByStepId } from "../approval-step-comments/dao";
import { transformMentionsToGraphQL } from "./service";
import { sliceAroundIndex } from "../../services/slice-around-index";
import db from "../../services/db";

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
    const { transactionProvider, session } = useRequireAuth(context);
    const { userId, role } = session;
    const trx = await transactionProvider();

    try {
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
          id: input.id,
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

      await trx.commit();

      return {
        ...commentWithResources,
        mentions: transformMentionsToGraphQL(commentWithResources.mentions),
      };
    } catch (err) {
      await trx.rollback(err);
      throw err;
    }
  },
};

async function getPageByCommentId({
  ktx,
  limit,
  commentId,
  annotationId,
  approvalStepId,
  parentCommentId,
}: {
  ktx: Knex;
  limit: number;
  annotationId: string | null;
  approvalStepId: string | null;
  commentId: string;
  parentCommentId: string | null;
}) {
  // get comment
  const comment = await CommentsDAO.findById(commentId);
  if (!comment) {
    throw new NotFoundError(`Could not find comment ${commentId}`);
  }

  // get comments before
  const baseBeforeOptions: FindCommentsByIdOptions = {
    limit: limit + 1,
    sortOrder: "desc",
    modify: createCommentPaginationModifier({
      cursor: { id: commentId, createdAt: comment.createdAt },
      sortOrder: "desc",
      parentCommentId,
    }),
  };
  const beforeComments = annotationId
    ? await findByAnnotationId(ktx, {
        ...baseBeforeOptions,
        annotationId,
      })
    : approvalStepId
    ? await findByStepId(ktx, {
        ...baseBeforeOptions,
        approvalStepId,
      })
    : [];

  // get comments after
  const baseAfterOptions: FindCommentsByIdOptions = {
    limit: limit + 2,
    sortOrder: "asc",
    modify: createCommentPaginationModifier({
      cursor: { id: commentId, createdAt: comment.createdAt },
      sortOrder: "asc",
      parentCommentId,
    }),
  };
  const afterComments = annotationId
    ? await findByAnnotationId(ktx, {
        ...baseAfterOptions,
        annotationId,
      })
    : approvalStepId
    ? await findByStepId(ktx, {
        ...baseAfterOptions,
        approvalStepId,
      })
    : [];

  // combine
  const comments = beforeComments.reverse().concat(afterComments.slice(1));
  const slicedComments = sliceAroundIndex({
    index: comments.findIndex((c: BaseComment) => c.id === commentId),
    array: comments,
    limit,
  });

  // create next and previous cursors from the list
  let previousCursor = null;
  if (comments[0].id !== slicedComments[0].id) {
    const commentIndex = comments.findIndex(
      (c: BaseComment) => c.id === slicedComments[0].id
    );
    if (commentIndex <= -1) {
      throw new Error(
        `Could not find comment ${slicedComments[0].id} in original list`
      );
    }
    previousCursor = createCursor({
      id: comments[commentIndex - 1].id,
      createdAt: comments[commentIndex - 1].createdAt,
    });
  }

  const nextCursor =
    comments[comments.length - 1].id ===
    slicedComments[slicedComments.length - 1].id
      ? null
      : createCursor({
          id: slicedComments[slicedComments.length - 1].id,
          createdAt: slicedComments[slicedComments.length - 1].createdAt,
        });

  return {
    previousCursor,
    nextCursor,

    data: await addCommentResources(ktx, slicedComments),
  };
}

interface GetCommentsArg {
  annotationId: string | null;
  approvalStepId: string | null;
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
      annotationId: String,
      approvalStepId: String,
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
    const { session } = useRequireAuth(context);
    const { userId, role } = session;

    if (
      (approvalStepId && annotationId) ||
      (!approvalStepId && !annotationId)
    ) {
      throw new UserInputError(
        "Either an approval step id or annotation id is required"
      );
    }

    const designId = await extractDesignIdFromCommentParent(db, {
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

    if (commentId) {
      return getPageByCommentId({
        ktx: db,
        limit,
        commentId,
        annotationId,
        approvalStepId,
        parentCommentId: parentCommentId || null,
      });
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

    const comments = annotationId
      ? await findByAnnotationId(db, {
          ...baseFindOptions,
          annotationId,
        })
      : approvalStepId
      ? await findByStepId(db, { ...baseFindOptions, approvalStepId })
      : [];

    if (nextCursor) {
      return getNextPage({
        ktx: db,
        comments,
        limit,
        currentCursor: nextCursor,
      });
    }

    return getPreviousPage({
      ktx: db,
      comments,
      limit,
      currentCursor: previousCursor,
    });
  },
};

export const CommentEndpoints = [getComments, createComment];
