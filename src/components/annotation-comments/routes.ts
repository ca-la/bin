import Router from 'koa-router';
import { pick } from 'lodash';

import {
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
  const userId = this.state.userId;
  const body = pick(this.request.body, BASE_COMMENT_PROPERTIES);
  const { annotationId } = this.params;

  if (body && isBaseComment(body) && annotationId) {
    const comment = yield CommentDAO.create({
      ...body,
      userId
    });
    const annotationComment = yield AnnotationCommentDAO.create({
      annotationId,
      commentId: comment.id
    });

    yield announceAnnotationCommentCreation(annotationComment, comment);
    yield sendCreationNotifications({
      actorUserId: this.state.userId,
      annotationId,
      comment
    });
    this.status = 201;
    this.body = comment;
  } else {
    this.throw(400, `Request does not match model: ${Object.keys(body)}`);
  }
}

router.put('/:commentId', requireAuth, createAnnotationComment);

export default router.routes();
