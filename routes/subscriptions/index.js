'use strict';

const router = require('koa-router')({
  prefix: '/subscriptions'
});

const { MAILCHIMP_LIST_ID_SUBSCRIPTIONS } = require('../../services/config');
const MailChimp = require('../../services/mailchimp');

/**
 * POST /subscriptions
 * @param {String} email
 * @param {String} name
 * @param {String} zip
 */
function* createSubscription() {
  const { email, name, zip } = this.state.body;

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
  this.body = { success: true };
}

router.post('/', createSubscription);

module.exports = router.routes();
