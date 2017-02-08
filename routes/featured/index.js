'use strict';

const Router = require('koa-router');

const {
  FEATURED_PRODUCT_IDS,
  FEATURED_COLLECTION_LISTS
} = require('../../services/config');

const router = new Router();

// eslint-disable-next-line require-yield
function* getFeatured() {
  this.status = 200;
  this.body = {
    productIds: FEATURED_PRODUCT_IDS,
    collectionLists: FEATURED_COLLECTION_LISTS
  };
}

router.get('/', getFeatured);

module.exports = router.routes();
