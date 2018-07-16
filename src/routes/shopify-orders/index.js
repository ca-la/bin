'use strict';

const Router = require('koa-router');

const ShopifyNotFoundError = require('../../errors/shopify-not-found');
const ShopifyClient = require('../../services/shopify');
const filterError = require('../../services/filter-error');

const shopify = new ShopifyClient(ShopifyClient.CALA_STORE_CREDENTIALS);

const router = new Router();

/**
 * GET /shopify-orders/:orderId
 *
 * TODO: Though order IDs are ~ fairly ~ unique / unguessable, we should
 * probably increase security here at some point. Some options would be:
 *   - Have this endpoint based around 'order token' or something similar
 *   - Enforce that the email on the order matches logged-in account email
 */
function* getOrderById() {
  const order = yield shopify.getOrder(this.params.orderId)
    .catch(filterError(ShopifyNotFoundError, err => this.throw(404, err.message)));

  this.status = 200;
  this.body = order;
}

router.get('/:orderId', getOrderById);

module.exports = router.routes();
