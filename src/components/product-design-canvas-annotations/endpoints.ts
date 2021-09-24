import { pick } from "lodash";
import uuid from "node-uuid";
import {
  requireAuth,
  composeMiddleware,
  attachDesignPermissions,
  requireDesignEditPermissions,
  GraphQLEndpoint,
  GraphQLContextAuthenticated,
  attachDesignFromAnnotationInput,
  Middleware,
} from "../../apollo";
import { createCommentWithAttachments } from "../../services/create-comment-with-attachments";
import * as AnnotationsDAO from "./dao";
import * as AnnotationCommentsDAO from "../annotation-comments/dao";
import { AnnotationDb } from "./types";
import {
  gtProductDesignCanvasAnnotation,
  gtAnnotationInput,
  AnnotationInput,
} from "./graphql-types";

interface CreateAnnotationArgs {
  annotation: AnnotationInput;
}

const CreateAnnotationEndpoint: GraphQLEndpoint<
  CreateAnnotationArgs,
  AnnotationDb,
  GraphQLContextAuthenticated<AnnotationDb>
> = {
  endpointType: "Mutation",
  types: [gtAnnotationInput, gtProductDesignCanvasAnnotation],
  name: "CreateAnnotation",
  signature: `(annotation: AnnotationInput): ProductDesignCanvasAnnotation`,
  middleware: composeMiddleware(
    requireAuth,
    attachDesignFromAnnotationInput,
    attachDesignPermissions,
    requireDesignEditPermissions
  ) as Middleware<
    CreateAnnotationArgs,
    GraphQLContextAuthenticated<AnnotationDb>,
    AnnotationDb
  >,
  resolver: async (
    _: any,
    args: CreateAnnotationArgs,
    context: GraphQLContextAuthenticated<AnnotationDb>
  ) => {
    const {
      transactionProvider,
      session: { userId },
    } = context;
    const { annotation: input } = args;

    const trx = await transactionProvider();
    try {
      const annotation = await AnnotationsDAO.create(trx, {
        ...pick(input, "id", "canvasId", "x", "y"),
        deletedAt: null,
        createdBy: userId,
      });

      const comment = await createCommentWithAttachments(trx, {
        comment: {
          id: uuid.v4(),
          createdAt: new Date(),
          deletedAt: null,
          text: input.commentText,
          parentCommentId: null,
          userId,
          isPinned: false,
        },
        attachments: [],
        userId,
      });

      await AnnotationCommentsDAO.create(
        {
          commentId: comment.id,
          annotationId: annotation.id,
        },
        trx
      );

      await trx.commit();
      return annotation;
    } catch (err) {
      await trx.rollback(err);
      throw err;
    }
  },
};

export const AnnotationEndpoints = [CreateAnnotationEndpoint];
