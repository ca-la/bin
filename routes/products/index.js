'use strict';

const Router = require('koa-router');
const pick = require('lodash/pick');

const { FEATURED_PRODUCT_IDS } = require('../../services/config');
const ShopifyNotFoundError = require('../../errors/shopify-not-found');
const Shopify = require('../../services/shopify');

const router = new Router();

/**
 * GET /products
 */
function* getList() {
  const filters = pick(this.query, 'handle');

  const products = yield Shopify.getAllProducts(filters);

  this.body = products;
  this.status = 200;
}

/**
 * GET /products/featured-ids
 *
 * TODO: This will no longer used in the app as of ~Feb 7, 2017. Safe to delete
 * once we're a few weeks past this point, since it was never in an App Store
 * release.
 */
// eslint-disable-next-line require-yield
function* getFeaturedIds() {
  this.body = FEATURED_PRODUCT_IDS;
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

router.get('/', getList);
router.get('/:productId', getById);
router.get('/featured-ids', getFeaturedIds);

module.exports = router.routes();
