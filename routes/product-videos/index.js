'use strict';

const Router = require('koa-router');
const ProductVideosDAO = require('../../dao/product-videos');

const router = new Router();

function* getVideos() {
  const idString = this.query.productIds;

  this.assert(idString, 400, 'Must provide ?productIds query');
  const productIds = idString.split(',');

  const videos = yield ProductVideosDAO.findByProductIds(productIds);

  this.body = videos;
  this.status = 200;
}

router.get('/', getVideos);

module.exports = router.routes();
