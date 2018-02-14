'use strict';

const Router = require('koa-router');

const router = new Router();

/**
 * POST /lifecycle-webhooks/purge-notifications
 *
 * Called on a regular interval by a scheduled Lambda function. When called,
 * this is our opportunity to find recent notifications, batch them up, and
 * email them to the appropriate recipients.
 */

// eslint-disable-next-line require-yield
function* postPurgeNotifications() {
  this.status = 200;
  this.body = { success: true };
}

router.post('/purge-notifications', postPurgeNotifications);

module.exports = router.routes();
