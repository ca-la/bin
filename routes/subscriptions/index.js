'use strict';

const Router = require('koa-router');

const MailChimp = require('../../services/mailchimp');
const shouldAllowAppointment = require('../../services/should-allow-appointment');
const { MAILCHIMP_LIST_ID_SUBSCRIPTIONS } = require('../../services/config');

const router = new Router();

/**
 * POST /subscriptions
 * @param {String} email
 * @param {String} name
 * @param {String} zip
 */
function* createSubscription() {
  const { email, name, zip } = this.request.body;

  if (!email || !name || !zip) {
    this.throw(400, 'Missing required information');
  }

  try {
    yield MailChimp.subscribe({
      email,
      name,
      zip,
      listId: MAILCHIMP_LIST_ID_SUBSCRIPTIONS
    });
  } catch (error) {
    this.throw(400, error.message);
  }

  this.status = 201;
  this.body = {
    success: true,
    shouldAllowAppointment: shouldAllowAppointment(zip)
  };
}

router.post('/', createSubscription);

module.exports = router.routes();
