'use strict';

const Router = require('koa-router');

const canAccessUserResource = require('../../middleware/can-access-user-resource');
const ProductDesignCommentsDAO = require('../../dao/product-design-comments');
const ProductDesignSectionsDAO = require('../../dao/product-design-sections');
const requireAuth = require('../../middleware/require-auth');
const sendCommentNotifications = require('../../services/send-comment-notifications');
const UsersDAO = require('../../components/users/dao');
const {
  attachDesignPermissions
} = require('../../middleware/can-access-design');

const router = new Router();

async function attachUser(comment) {
  const user = await UsersDAO.findById(comment.userId);
  comment.setUser(user);
  return comment;
}

function* getByDesign() {
  const { designId } = this.query;
  this.assert(designId, 403, 'Design ID required');

  yield attachDesignPermissions.call(this, designId);

  const comments = yield ProductDesignCommentsDAO.findByDesign(designId);
  const commentsWithUsers = yield Promise.all(comments.map(attachUser));

  this.body = commentsWithUsers;
  this.status = 200;
}

function* deleteComment() {
  const { commentId } = this.params;
  const comment = yield ProductDesignCommentsDAO.findById(commentId);
  this.assert(comment, 404);
  canAccessUserResource.call(this, comment.userId);

  yield ProductDesignCommentsDAO.deleteById(commentId);

  this.status = 204;
}

function* update() {
  const { body } = this.request;
  const { commentId } = this.params;

  const comment = yield ProductDesignCommentsDAO.findById(commentId);
  this.assert(comment, 404);

  const keysToUpdate = Object.keys(body);

  if (keysToUpdate.length === 1 && keysToUpdate[0] === 'isPinned') {
    // Only trying to pin/unpin a comment, no need for auth check.
  } else {
    canAccessUserResource.call(this, comment.userId);
  }

  const updated = yield ProductDesignCommentsDAO.update(
    commentId,
    this.request.body
  );
  const withUser = yield attachUser(updated);

  this.body = withUser;
  this.status = 200;
}

function* create() {
  const { parentCommentId, sectionId, text } = this.request.body;

  this.assert(text, 400, 'Comment text cannot be empty');

  const section = yield ProductDesignSectionsDAO.findById(sectionId);
  this.assert(section, 400, 'Invalid section ID');

  yield attachDesignPermissions.call(this, section.designId);

  const created = yield ProductDesignCommentsDAO.create({
    parentCommentId,
    sectionId,
    text,
    userId: this.state.userId
  });

  const withUser = yield attachUser(created);

  yield sendCommentNotifications({
    comment: created,
    design: this.state.design,
    section,
    text,
    user: withUser.user
  });

  this.body = withUser;
  this.status = 201;
}

router.get('/', requireAuth, getByDesign);
router.post('/', requireAuth, create);
router.del('/:commentId', requireAuth, deleteComment);
router.patch('/:commentId', requireAuth, update);

module.exports = router.routes();
