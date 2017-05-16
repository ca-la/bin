'use strict';

const Router = require('koa-router');

const UsersDAO = require('../../dao/users');

const router = new Router();

/**
 * POST /incoming-preregistration
 *
 * Users can message a phone number at CALA events to "pre-register" for a CALA
 * account. They send their full name to this number; we create a Shopify
 * account for them and reply with a link to finish setting up their account.
 * This allows us to check them out quickly and have them complete their profile
 * asynchronously afterwards.
 */
function* postIncomingPreRegistration() {
  yield Promise.resolve();

  this.status = 200;
  this.body = {
    success: true
  };
}

router.post('/incoming-preregistration-sms', postIncomingPreRegistration);

module.exports = router.routes();
