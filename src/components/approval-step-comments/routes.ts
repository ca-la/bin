import { BaseComment } from '@cala/ts-lib';
import { Asset } from '@cala/ts-lib/dist/assets';
import Knex from 'knex';
import { pick } from 'lodash';
import Router from 'koa-router';

import {
  BASE_COMMENT_PROPERTIES,
  isBaseComment
} from '../comments/domain-object';
import { createCommentWithAttachments } from '../../services/create-comment-with-attachments';
import db from '../../services/db';
import * as ApprovalStepCommentDAO from './dao';
import * as NotificationsService from '../../services/create-notifications';
import requireAuth from '../../middleware/require-auth';
import addAtMentionDetails, {
  getCollaboratorsFromCommentMentions,
  getThreadUserIdsFromCommentThread
} from '../../services/add-at-mention-details';
import { addAttachmentLinks } from '../../services/add-attachments-links';
import { announceApprovalStepCommentCreation } from '../iris/messages/approval-step-comment';

const router = new Router();

function* createApprovalStepComment(
  this: AuthedContext<BaseComment & { attachments: Asset[] }>
): Iterator<any, any, any> {
  const userId = this.state.userId;
  const body = pick(this.request.body, BASE_COMMENT_PROPERTIES);
  const attachments: Asset[] = this.request.body.attachments || [];
  const { approvalStepId } = this.params;

  if (!body || !isBaseComment(body)) {
    this.throw(400, `Request does not match model: ${Object.keys(body)}`);
  }

  return db.transaction(async (trx: Knex.Transaction) => {
    const comment = await createCommentWithAttachments(trx, {
      comment: body,
      attachments,
      userId
    });

    const approvalStepComment = await ApprovalStepCommentDAO.create(trx, {
      approvalStepId,
      commentId: comment.id
    });

    const {
      mentionedUserIds,
      collaboratorNames
    } = await getCollaboratorsFromCommentMentions(trx, comment.text);

    for (const mentionedUserId of mentionedUserIds) {
      await NotificationsService.sendApprovalStepCommentMentionNotification(
        trx,
        {
          approvalStepId,
          commentId: comment.id,
          actorId: userId,
          recipientId: mentionedUserId
        }
      );
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
        recipientId: threadUserId
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

    const commentWithMentions = { ...comment, mentions: collaboratorNames };
    await announceApprovalStepCommentCreation(
      approvalStepComment,
      commentWithMentions
    );

    this.status = 201;
    this.body = commentWithMentions;
  });
}

function* getApprovalStepComments(
  this: AuthedContext
): Iterator<any, any, any> {
  const comments = yield db.transaction((trx: Knex.Transaction) =>
    ApprovalStepCommentDAO.findByStepId(trx, this.params.approvalStepId)
  );
  if (!comments) {
    this.throw(404);
  }

  const commentsWithMentions = yield addAtMentionDetails(comments);
  const commentsWithAttachments = commentsWithMentions.map(addAttachmentLinks);
  this.status = 200;
  this.body = commentsWithAttachments;
}

router.get('/:approvalStepId', requireAuth, getApprovalStepComments);
router.post('/:approvalStepId', requireAuth, createApprovalStepComment);

export default router.routes();
