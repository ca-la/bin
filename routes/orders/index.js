'use strict';

const router = require('koa-router')({
  prefix: '/orders'
});

const ShopifyNotFoundError = require('../../errors/shopify-not-found');
const { getOrder } = require('../../services/shopify');

/**
 * GET /orders/:orderId
 *
 * TODO: Though order IDs are ~ fairly ~ unique / unguessable, we should
 * probably increase security here at some point. Some options would be:
 *   - Have this endpoint based around 'order token' or something similar
 *   - Enforce that the email on the order matches logged-in account email
 */
function* getOrderById() {
  const order = yield getOrder(this.params.orderId)
    .catch(ShopifyNotFoundError, err => this.throw(404, err.message));

  this.status = 200;
  this.body = order;
}

router.get('/:orderId', getOrderById);

module.exports = router.routes();
