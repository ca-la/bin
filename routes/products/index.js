'use strict';

const router = require('koa-router')({
  prefix: '/products'
});

const { FEATURED_PRODUCT_IDS } = require('../../services/config');
const ShopifyNotFoundError = require('../../errors/shopify-not-found');
const Shopify = require('../../services/shopify');

/**
 * GET /products
 */
function* getList() {
  const products = yield Shopify.getAllProducts();

  this.body = products;
  this.status = 200;
}

/**
 * GET /products/featured-ids
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
