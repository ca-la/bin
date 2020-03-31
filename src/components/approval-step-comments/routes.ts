import { BaseComment, CommentWithMentions } from '@cala/ts-lib';
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
import requireAuth from '../../middleware/require-auth';
import addAtMentionDetails, {
  addAtMentionDetailsForComment
} from '../../services/add-at-mention-details';
import { addAttachmentLinks } from '../../services/add-attachments-links';

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
    if (!comment) {
      throw new Error('Could not retrieve created comment');
    }

    await ApprovalStepCommentDAO.create(trx, {
      approvalStepId,
      commentId: comment.id
    });

    const commentWithMentions: CommentWithMentions = await addAtMentionDetailsForComment(
      comment
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
