'use strict';

const Router = require('koa-router');
const pick = require('lodash/pick');

const ShopifyNotFoundError = require('../../errors/shopify-not-found');
const ShopifyClient = require('../../services/shopify');
const filterError = require('../../services/filter-error');

const shopify = new ShopifyClient(ShopifyClient.CALA_STORE_CREDENTIALS);

const router = new Router();

/**
 * GET /shopify-products
 */
function* getList() {
  const filters = pick(this.query, 'handle');

  const options = {
    includeDesigners: this.query.includeDesigners === 'true'
  };

  const products = yield shopify.getAllProducts(filters, options);

  this.body = products;
  this.status = 200;
}

/**
 * GET /shopify-products/:productId
 */
function* getById() {
  const product = yield shopify.getProductById(this.params.productId)
    .catch(filterError(ShopifyNotFoundError, err => this.throw(404, err.message)));

  this.body = product;
  this.status = 200;
}

/**
 * GET /shopify-products/:productId/collections
 */
function* getCollections() {
  const collections = yield shopify.getCollections({ product_id: this.params.productId })
    .catch(filterError(ShopifyNotFoundError, err => this.throw(404, err.message)));

  this.body = collections;
  this.status = 200;
}

router.get('/', getList);
router.get('/:productId', getById);
router.get('/:productId/collections', getCollections);

module.exports = router.routes();
