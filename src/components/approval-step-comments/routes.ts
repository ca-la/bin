import Router from "koa-router";

import { createCommentWithAttachments } from "../../services/create-comment-with-attachments";
import * as ApprovalStepCommentDAO from "./dao";
import * as NotificationsService from "../../services/create-notifications";
import requireAuth from "../../middleware/require-auth";
import {
  getCollaboratorsFromCommentMentions,
  getThreadUserIdsFromCommentThread,
} from "../../services/add-at-mention-details";
import { announceApprovalStepCommentCreation } from "../iris/messages/approval-step-comment";
import useTransaction, {
  TransactionState,
} from "../../middleware/use-transaction";
import { Asset } from "../assets/types";
import {
  CommentWithResources,
  CreateCommentWithResources,
  createCommentWithResourcesSchema,
} from "../comments/types";
import convert from "koa-convert";
import {
  SafeBodyState,
  typeGuardFromSchema,
} from "../../middleware/type-guard";
import { StrictContext } from "../../router-context";

const router = new Router();

interface CreateCommentContext extends StrictContext<CommentWithResources> {
  state: AuthedState &
    TransactionState &
    SafeBodyState<CreateCommentWithResources>;
  params: { approvalStepId: string };
}

async function createApprovalStepComment(ctx: CreateCommentContext) {
  const { trx, userId } = ctx.state;
  const attachments: Asset[] = ctx.state.safeBody.attachments || [];
  const { approvalStepId } = ctx.params;

  const comment = await createCommentWithAttachments(trx, {
    comment: ctx.state.safeBody,
    attachments,
    userId,
  });

  const approvalStepComment = await ApprovalStepCommentDAO.create(trx, {
    approvalStepId,
    commentId: comment.id,
  });

  const {
    mentionedUserIds,
    idNameMap,
  } = await getCollaboratorsFromCommentMentions(trx, comment.text);

  for (const mentionedUserId of mentionedUserIds) {
    await NotificationsService.sendApprovalStepCommentMentionNotification(trx, {
      approvalStepId,
      commentId: comment.id,
      actorId: userId,
      recipientId: mentionedUserId,
    });
  }

  const threadUserIds: string[] =
    comment.parentCommentId && mentionedUserIds.length === 0
      ? await getThreadUserIdsFromCommentThread(trx, comment.parentCommentId)
      : [];

  for (const threadUserId of threadUserIds) {
    await NotificationsService.sendApprovalStepCommentReplyNotification(trx, {
      approvalStepId,
      commentId: comment.id,
      actorId: userId,
      recipientId: threadUserId,
    });
  }

  await NotificationsService.sendDesignOwnerApprovalStepCommentCreateNotification(
    trx,
    approvalStepId,
    comment.id,
    userId,
    mentionedUserIds,
    threadUserIds
  );

  const commentWithResources = { ...comment, mentions: idNameMap };
  await announceApprovalStepCommentCreation(
    approvalStepComment,
    commentWithResources
  );

  ctx.status = 201;
  ctx.body = commentWithResources;
}

router.post(
  "/:approvalStepId",
  requireAuth,
  typeGuardFromSchema<CreateCommentWithResources>(
    createCommentWithResourcesSchema
  ),
  useTransaction,
  convert.back(createApprovalStepComment)
);

export default router.routes();
