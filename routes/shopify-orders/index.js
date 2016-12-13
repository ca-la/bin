'use strict';

const router = require('koa-router')({
  prefix: '/shopify-orders'
});

const ShopifyNotFoundError = require('../../errors/shopify-not-found');
const { getOrder } = require('../../services/shopify');

/**
 * GET /shopify-orders/:orderId
 */
function* getOrderById() {
  const order = yield getOrder(this.params.orderId)
    .catch(ShopifyNotFoundError, err => this.throw(404, err.message));

  this.status = 200;
  this.body = order;
}

router.get('/:orderId', getOrderById);

module.exports = router.routes();
