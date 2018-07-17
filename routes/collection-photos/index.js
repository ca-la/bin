'use strict';

const Router = require('koa-router');

const CollectionPhotosDAO = require('../../dao/product-videos');
const requireAuth = require('../../middleware/require-auth');
const User = require('../../domain-objects/user');

const router = new Router();

function* getPhotos() {
  const { collectionId } = this.query;

  this.assert(collectionId, 400, 'Must provide a collection ID');

  const photos = yield CollectionPhotosDAO.findByCollectionId(collectionId);

  this.body = photos;
  this.status = 200;
}

function* createPhoto() {
  this.assert(this.state.role === User.ROLES.admin, 403);

  const { collectionId, photoUrl } = this.request.body;
  const photo = yield CollectionPhotosDAO.create({
    collectionId,
    photoUrl
  });

  this.body = photo;
  this.status = 201;
}

router.get('/', getPhotos);
router.post('/', requireAuth, createPhoto);

module.exports = router.routes();
