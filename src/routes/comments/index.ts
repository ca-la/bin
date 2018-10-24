import * as Router from 'koa-router';
import * as Koa from 'koa';

import * as CommentDAO from '../../dao/comments';
import requireAuth = require('../../middleware/require-auth');

const router = new Router();

function* deleteComment(this: Koa.Application.Context): AsyncIterableIterator<void> {
  const { commentId } = this.params;
  const comment = yield CommentDAO.findById(commentId);

  this.assert(comment, 404);

  yield CommentDAO.deleteById(commentId);
  this.status = 204;
}

router.del('/:commentId', requireAuth, deleteComment);

export = router.routes();
