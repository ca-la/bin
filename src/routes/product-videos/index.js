'use strict';

const Router = require('koa-router');

const ProductVideosDAO = require('../../dao/product-videos');
const requireAuth = require('../../middleware/require-auth');
const User = require('../../components/users/domain-object');

const router = new Router();

function* getVideos() {
  const idString = this.query.productIds;

  this.assert(idString, 400, 'Must provide a list of product IDs');
  const productIds = idString.split(',');

  const videos = yield ProductVideosDAO.findByProductIds(productIds);

  this.body = videos;
  this.status = 200;
}

function* createVideo() {
  this.assert(this.state.role === User.ROLES.admin, 403);

  const { productId, videoUrl, posterImageUrl } = this.request.body;
  const video = yield ProductVideosDAO.create({
    productId,
    videoUrl,
    posterImageUrl
  });

  this.body = video;
  this.status = 201;
}

router.get('/', getVideos);
router.post('/', requireAuth, createVideo);

module.exports = router.routes();
