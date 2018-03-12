'use strict';

const Router = require('koa-router');

const canAccessUserResource = require('../../middleware/can-access-user-resource');
const ProductDesignCommentsDAO = require('../../dao/product-design-comments');
const requireAuth = require('../../middleware/require-auth');
const { canAccessDesignId } = require('../../middleware/can-access-design');

const router = new Router();

function* getByDesign() {
  const { designId } = this.query;
  this.assert(designId, 403, 'Design ID required');

  yield canAccessDesignId.call(this, designId);

  const comments = yield ProductDesignCommentsDAO.findByDesign(designId);
  this.body = comments;
  this.status = 200;
}

function* deleteComment() {
  const { commentId } = this.params;
  const comment = yield ProductDesignCommentsDAO.findById(commentId);
  this.assert(comment, 404);
  yield canAccessUserResource.call(this, comment.userId);

  yield ProductDesignCommentsDAO.deleteById(commentId);

  this.status = 204;
}

function* update() {
  const { commentId } = this.params;
  const comment = yield ProductDesignCommentsDAO.findById(commentId);
  this.assert(comment, 404);
  yield canAccessUserResource.call(this, comment.userId);

  const updated = yield ProductDesignCommentsDAO.update(commentId, this.request.body);

  this.body = updated;
  this.status = 200;
}

router.get('/', requireAuth, getByDesign);
router.del('/:commentId', requireAuth, deleteComment);
router.patch('/:commentId', requireAuth, update);

module.exports = router.routes();
