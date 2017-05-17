'use strict';

const Router = require('koa-router');

const formDataBody = require('../../middleware/form-data-body');
const InvalidDataError = require('../../errors/invalid-data');
const Logger = require('../../services/logger');
const SessionsDAO = require('../../dao/sessions');
const Shopify = require('../../services/shopify');
const UsersDAO = require('../../dao/users');
const { buildSMSResponseMarkup } = require('../../services/twilio');
const { SITE_HOST } = require('../../services/config');

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

    yield Shopify.createCustomer({
      name: messageBody,
      phone: fromNumber
    });
  } catch (err) {
    if (err instanceof InvalidDataError) {
      Logger.logClientError(err);
      this.body = buildSMSResponseMarkup(`Error signing up: ${err.message}`);
    } else {
      Logger.logServerError(err);
      this.body = buildSMSResponseMarkup('Error signing up. Please email us at hi@ca.la for assistance');
    }

    this.status = 200;
    return;
  }

  const session = yield SessionsDAO.createForUser(user);

  const URL = `${SITE_HOST}/sms-signup/${session.id}`;

  this.body = buildSMSResponseMarkup(`Welcome to CALA. To complete your profile, visit: ${URL}`);
}

router.post('/incoming-preregistration-sms', formDataBody, postIncomingPreRegistration);

module.exports = router.routes();
