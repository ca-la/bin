'use strict';

const Router = require('koa-router');

const formDataBody = require('../../middleware/form-data-body');
const InvalidDataError = require('../../errors/invalid-data');
const UsersDAO = require('../../dao/users');
const Logger = require('../../services/logger');
const { buildSMSResponseMarkup } = require('../../services/twilio');

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
  const fromNumber = this.request.formDataBody.From;
  const messageBody = this.request.formDataBody.Body;

  this.status = 200;
  this.set('content-type', 'text/xml');

  let user;

  try {
    user = yield UsersDAO.createSmsPreregistration({
      phone: fromNumber,
      name: messageBody
    });
  } catch (err) {
    if (err instanceof InvalidDataError) {
      Logger.logClientError(err);
      this.body = buildSMSResponseMarkup(`Error signing up: ${err.message}`);
    } else {
      Logger.logServerError(err);
      this.body = buildSMSResponseMarkup('Error signing up. Please email us at hi@ca.la for assistance');
    }

    return;
  }

  this.body = buildSMSResponseMarkup(`Welcome to CALA, ${user.name}. Your account is ready to use!`);
}

router.post('/incoming-preregistration-sms', formDataBody, postIncomingPreRegistration);

module.exports = router.routes();
