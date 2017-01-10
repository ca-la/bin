'use strict';

const router = require('koa-router')({
  prefix: '/collections'
});

const Shopify = require('../../services/shopify');

/**
 * GET /collections
 */
function* getList() {
  const collections = yield Shopify.getCollections();

  this.body = collections;
  this.status = 200;
}

/**
 * GET /collections/:collectionId/products
 */
function* getProducts() {
  const products = yield Shopify.getProductsByCollectionId(this.params.collectionId);

  this.body = products;
  this.status = 200;
}

router.get('/', getList);
router.get('/:collectionId/products', getProducts);

module.exports = router.routes();
