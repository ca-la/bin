import * as Router from 'koa-router';
import * as Koa from 'koa';

import * as AnnotationCommentsDAO from '../../components/annotation-comments/dao';
import * as CommentDAO from './dao';
import requireAuth = require('../../middleware/require-auth');
import { announceAnnotationCommentDeletion } from '../iris/messages/annotation-comment';
import { announceTaskCommentDeletion } from '../iris/messages/task-comment';

const router = new Router();

interface GetListQuery {
  annotationIds?: string[];
}

function* getList(this: Koa.Application.Context): Iterator<any, any, any> {
  const query: GetListQuery = this.query;

  if (!query.annotationIds) {
    return this.throw(400, 'Missing annotationIds!');
  }

  const idList = Array.isArray(query.annotationIds)
    ? query.annotationIds
    : [query.annotationIds];

  const commentsByAnnotation = yield AnnotationCommentsDAO.findByAnnotationIds(
    idList
  );

  this.body = commentsByAnnotation;
  this.status = 200;
}

interface DeleteCommentQuery {
  annotationId?: string;
  taskId?: string;
}

function* deleteComment(
  this: Koa.Application.Context
): Iterator<any, any, any> {
  const { userId } = this.state;
  const { annotationId, taskId }: DeleteCommentQuery = this.query;
  const { commentId } = this.params;
  const comment = yield CommentDAO.findById(commentId);

  this.assert(comment, 404);

  yield CommentDAO.deleteById(commentId);

  if (annotationId) {
    yield announceAnnotationCommentDeletion({
      actorId: userId,
      annotationId,
      commentId
    });
  } else if (taskId) {
    yield announceTaskCommentDeletion({ actorId: userId, commentId, taskId });
  }

  this.status = 204;
}

router.get('/', requireAuth, getList);
router.del('/:commentId', requireAuth, deleteComment);

export default router.routes();
