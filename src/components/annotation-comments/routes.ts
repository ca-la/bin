import Router from 'koa-router';
import Knex from 'knex';
import { pick } from 'lodash';

import db from '../../services/db';
import Comment, {
  BASE_COMMENT_PROPERTIES,
  BaseComment,
  isBaseComment
} from '../comments/domain-object';
import * as CommentDAO from '../comments/dao';
import * as AnnotationCommentDAO from '../annotation-comments/dao';
import sendCreationNotifications from './send-creation-notifications';
import requireAuth = require('../../middleware/require-auth');
import { announceAnnotationCommentCreation } from '../iris/messages/annotation-comment';

const router = new Router();

function* createAnnotationComment(
  this: AuthedContext<BaseComment>
): Iterator<any, any, any> {
  let comment: Comment | undefined;
  const userId = this.state.userId;
  const body = pick(this.request.body, BASE_COMMENT_PROPERTIES);
  const { annotationId } = this.params;

  if (body && isBaseComment(body) && annotationId) {
    yield db.transaction(async (trx: Knex.Transaction) => {
      comment = await CommentDAO.create(
        {
          ...body,
          userId
        },
        trx
      );
      const annotationComment = await AnnotationCommentDAO.create(
        {
          annotationId,
          commentId: comment.id
        },
        trx
      );

      await announceAnnotationCommentCreation(annotationComment, comment);
      await sendCreationNotifications(
        {
          actorUserId: this.state.userId,
          annotationId,
          comment
        },
        trx
      );
    });
    this.status = 201;
    this.body = comment;
  } else {
    this.throw(400, `Request does not match model: ${Object.keys(body)}`);
  }
}

router.put('/:commentId', requireAuth, createAnnotationComment);

export default router.routes();
