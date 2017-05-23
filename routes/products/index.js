'use strict';

const Router = require('koa-router');
const pick = require('lodash/pick');

const ShopifyNotFoundError = require('../../errors/shopify-not-found');
const Shopify = require('../../services/shopify');

const router = new Router();

/**
 * GET /products
 */
function* getList() {
  const filters = pick(this.query, 'handle');

  const options = {
    includeDesigners: this.query.includeDesigners === 'true'
  };

  const products = yield Shopify.getAllProducts(filters, options);

  this.body = products;
  this.status = 200;
}

/**
 * GET /products/:productId
 */
function* getById() {
  const product = yield Shopify.getProductById(this.params.productId)
    .catch(ShopifyNotFoundError, err => this.throw(404, err.message));

  this.body = product;
  this.status = 200;
}

/**
 * GET /products/:productId/collections
 */
function* getCollections() {
  const collections = yield Shopify.getCollections({ product_id: this.params.productId })
    .catch(ShopifyNotFoundError, err => this.throw(404, err.message));

  this.body = collections;
  this.status = 200;
}

router.get('/', getList);
router.get('/:productId', getById);
router.get('/:productId/collections', getCollections);

module.exports = router.routes();
