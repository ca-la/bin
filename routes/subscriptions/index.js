'use strict';

const Router = require('koa-router');

const MailChimp = require('../../services/mailchimp');

const router = new Router();

/**
 * POST /subscriptions
 * @param {String} email
 * @param {String} name
 * @param {String} zip
 */
function* createSubscription() {
  const { email, name, zip } = this.request.body;

  if (!email) {
    this.throw(400, 'Missing required information');
  }

  try {
    yield MailChimp.subscribeToSubscriptions({
      email,
      name,
      zip
    });
  } catch (error) {
    this.throw(400, error.message);
  }

  this.status = 201;
  this.body = {
    success: true
  };
}

/**
 * POST /subscriptions/partners
 * @param {String} email
 * @param {String} name
 * @param {String} companyName
 * @param {String} comments
 * @param {String} source
 */
function* createPartnerSubscription() {
  const { email, name, companyName, comments, source } = this.request.body;

  if (!email || !name) {
    this.throw(400, 'Missing required information');
  }

  try {
    yield MailChimp.subscribeToPartners({
      email,
      name,
      companyName,
      comments,
      source
    });
  } catch (error) {
    this.throw(400, error.message);
  }

  this.status = 201;
  this.body = { success: true };
}

router.post('/', createSubscription);
router.post('/partners', createPartnerSubscription);

module.exports = router.routes();
