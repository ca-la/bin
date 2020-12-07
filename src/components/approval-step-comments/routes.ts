import { pick } from "lodash";
import Router from "koa-router";

import {
  BASE_COMMENT_PROPERTIES,
  isBaseComment,
} from "../comments/domain-object";
import { createCommentWithAttachments } from "../../services/create-comment-with-attachments";
import * as ApprovalStepCommentDAO from "./dao";
import * as NotificationsService from "../../services/create-notifications";
import requireAuth from "../../middleware/require-auth";
import {
  getCollaboratorsFromCommentMentions,
  getThreadUserIdsFromCommentThread,
} from "../../services/add-at-mention-details";
import { announceApprovalStepCommentCreation } from "../iris/messages/approval-step-comment";
import useTransaction from "../../middleware/use-transaction";
import { Asset } from "../assets/types";
import { BaseComment } from "../comments/types";

const router = new Router();

function* createApprovalStepComment(
  this: TrxContext<AuthedContext<BaseComment & { attachments: Asset[] }>>
): Iterator<any, any, any> {
  const { trx, userId } = this.state;
  const body = pick(this.request.body, BASE_COMMENT_PROPERTIES);
  const attachments: Asset[] = this.request.body.attachments || [];
  const { approvalStepId } = this.params;

  if (!body || !isBaseComment(body)) {
    this.throw(400, `Request does not match model: ${Object.keys(body)}`);
  }

  const comment = yield createCommentWithAttachments(trx, {
    comment: body,
    attachments,
    userId,
  });

  const approvalStepComment = yield ApprovalStepCommentDAO.create(trx, {
    approvalStepId,
    commentId: comment.id,
  });

  const {
    mentionedUserIds,
    idNameMap,
  } = yield getCollaboratorsFromCommentMentions(trx, comment.text);

  for (const mentionedUserId of mentionedUserIds) {
    yield NotificationsService.sendApprovalStepCommentMentionNotification(trx, {
      approvalStepId,
      commentId: comment.id,
      actorId: userId,
      recipientId: mentionedUserId,
    });
  }

  const threadUserIds: string[] =
    comment.parentCommentId && mentionedUserIds.length === 0
      ? yield getThreadUserIdsFromCommentThread(trx, comment.parentCommentId)
      : [];

  for (const threadUserId of threadUserIds) {
    yield NotificationsService.sendApprovalStepCommentReplyNotification(trx, {
      approvalStepId,
      commentId: comment.id,
      actorId: userId,
      recipientId: threadUserId,
    });
  }

  yield NotificationsService.sendDesignOwnerApprovalStepCommentCreateNotification(
    trx,
    approvalStepId,
    comment.id,
    userId,
    mentionedUserIds,
    threadUserIds
  );

  const commentWithMentions = { ...comment, mentions: idNameMap };
  yield announceApprovalStepCommentCreation(
    trx,
    approvalStepComment,
    commentWithMentions
  );

  this.status = 201;
  this.body = commentWithMentions;
}

router.post(
  "/:approvalStepId",
  requireAuth,
  useTransaction,
  createApprovalStepComment
);

export default router.routes();
