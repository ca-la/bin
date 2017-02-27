'use strict';

const Router = require('koa-router');

const Shopify = require('../../services/shopify');

const router = new Router();

/**
 * GET /collections
 */
function* getList() {
  const collections = yield Shopify.getCollections();

  this.body = collections;
  this.status = 200;
}

/**
 * GET /collections/:handle
 */
function* getCollection() {
  const collection = yield Shopify.getCollectionByHandle(this.params.handle);

  this.assert(collection, 404, 'Collection not found');

  this.body = collection;
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
router.get('/:handle', getCollection);

module.exports = router.routes();
