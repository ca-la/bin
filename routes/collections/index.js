'use strict';

const pick = require('lodash/pick');
const Router = require('koa-router');

const ShopifyClient = require('../../services/shopify');

const shopify = new ShopifyClient(ShopifyClient.CALA_STORE_CREDENTIALS);
const router = new Router();

/**
 * GET /collections
 */
function* getList() {
  const filters = pick(this.query, 'handle');

  const collections = yield shopify.getCollections(filters);

  this.body = collections;
  this.status = 200;
}

/**
 * GET /collections/:collectionId/products
 */
function* getProducts() {
  const products = yield shopify.getProductsByCollectionId(this.params.collectionId);

  this.body = products;
  this.status = 200;
}

router.get('/', getList);
router.get('/:collectionId/products', getProducts);

module.exports = router.routes();
