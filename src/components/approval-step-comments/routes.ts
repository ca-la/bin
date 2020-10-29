import { BaseComment } from "@cala/ts-lib";
import { Asset } from "@cala/ts-lib/dist/assets";
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
import addAtMentionDetails, {
  getCollaboratorsFromCommentMentions,
  getThreadUserIdsFromCommentThread,
} from "../../services/add-at-mention-details";
import { addAttachmentLinks } from "../../services/add-attachments-links";
import { announceApprovalStepCommentCreation } from "../iris/messages/approval-step-comment";
import useTransaction from "../../middleware/use-transaction";

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

function* getApprovalStepComments(
  this: TrxContext<AuthedContext>
): Iterator<any, any, any> {
  const { trx } = this.state;
  const comments = yield ApprovalStepCommentDAO.findByStepId(
    trx,
    this.params.approvalStepId
  );
  if (!comments) {
    this.throw(404);
  }

  const commentsWithMentions = yield addAtMentionDetails(trx, comments);
  const commentsWithAttachments = commentsWithMentions.map(addAttachmentLinks);
  this.status = 200;
  this.body = commentsWithAttachments;
}

router.get(
  "/:approvalStepId",
  requireAuth,
  useTransaction,
  getApprovalStepComments
);
router.post(
  "/:approvalStepId",
  requireAuth,
  useTransaction,
  createApprovalStepComment
);

export default router.routes();
