import uuid from "node-uuid";
import {
  GraphQLEndpoint,
  ForbiddenError,
  GraphQLContextBase,
  useRequireAuth,
} from "../../apollo";
import {
  CommentInput,
  CommentInputType,
  CommentWithResources,
  CommentWithResourcesType,
} from "./graphql-types";
import { Attachment } from "../assets/graphql-types";
import { extractDesignIdFromCommentInput } from "./dao";
import { getDesignPermissions } from "../../services/get-permissions";
import { createCommentWithAttachments } from "../../services/create-comment-with-attachments";
import * as ApprovalStepService from "../approval-step-comments/service";
import * as AnnotationService from "../annotation-comments/service";

interface CreateCommentArgs {
  comment: CommentInputType;
}

const createComment: GraphQLEndpoint<
  CreateCommentArgs,
  CommentWithResourcesType,
  GraphQLContextBase<CommentWithResourcesType>
> = {
  endpointType: "Mutation",
  types: [CommentInput, CommentWithResources, Attachment],
  name: "createComment",
  signature: `(comment: ${CommentInput.name}): ${CommentWithResources.name}`,
  resolver: async (
    _: unknown,
    args: CreateCommentArgs,
    context: GraphQLContextBase<CommentWithResourcesType>
  ) => {
    const { comment: input } = args;
    const { trx, session } = useRequireAuth(context);
    const { userId, role } = session;

    const designId = await extractDesignIdFromCommentInput(trx, input);
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

    return commentWithResources;
  },
};

export const CommentEndpoints = [createComment];
