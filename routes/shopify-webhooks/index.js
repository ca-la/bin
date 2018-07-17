'use strict';

const Router = require('koa-router');
const find = require('lodash/find');

const UserAttributesService = require('../../services/user-attributes');
const Logger = require('../../services/logger');

const router = new Router();

/**
 * POST /orders-create
 *
 * Shopify will hit this endpoint when the "orders/create" topic is triggered...
 * aka when an order is created.
 */
function* postOrdersCreate() {
  this.status = 200;
  this.body = { success: true };

  const attributes = this.request.body.note_attributes || [];

  const userIdAttr = find(attributes, { name: 'userId' });
  const userId = userIdAttr && userIdAttr.value;

  if (!userId) {
    Logger.logWarning('Shopify webhook missing user ID. Maybe an order was created without a CALA account?');
    return;
  }

  try {
    yield UserAttributesService.recordPurchase(userId);
  } catch (err) {
    Logger.logServerError(err);
  }
}

router.post('/orders-create', postOrdersCreate);

module.exports = router.routes();
