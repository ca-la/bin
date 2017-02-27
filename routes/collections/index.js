'use strict';

const pick = require('lodash/pick');
const Router = require('koa-router');

const Shopify = require('../../services/shopify');

const router = new Router();

/**
 * GET /collections
 */
function* getList() {
  const filters = pick(this.query, 'handle');

  const collections = yield Shopify.getCollections(filters);

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
