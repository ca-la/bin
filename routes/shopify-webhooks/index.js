'use strict';

const Router = require('koa-router');
const find = require('lodash/find');

const UserAttributesService = require('../../services/user-attributes');

const router = new Router();

/**
 * POST /orders-create
 *
 * Shopify will hit this endpoint when the "orders/create" topic is triggered...
 * aka when an order is created.
 */
function* postOrdersCreate() {
  const attributes = this.request.body.note_attributes || [];

  const userIdAttr = find(attributes, { name: 'userId' });
  const userId = userIdAttr && userIdAttr.value;

  this.assert(userId, 400, 'Missing user ID');

  const result = yield UserAttributesService.recordPurchase(userId);

  this.status = 200;
  this.body = {
    success: true
  };
}

router.post('/orders-create', postOrdersCreate);

module.exports = router.routes();
