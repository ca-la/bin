'use strict';

const router = require('koa-router')({
  prefix: '/products'
});

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
 * GET /products/:productId
 */
function* getById() {
  const product = yield Shopify.getProductById(this.params.productId)
    .catch(ShopifyNotFoundError, err => this.throw(404, err.message));

  this.body = product;
  this.status = 200;
}

router.get('/:productId', getById);
router.get('/', getList);

module.exports = router.routes();
