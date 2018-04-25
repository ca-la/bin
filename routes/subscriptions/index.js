'use strict';

const Router = require('koa-router');

const MailChimp = require('../../services/mailchimp');
const { MAILCHIMP_LIST_ID_PARTNERS } = require('../../config');

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
 * @param {String} firstName
 * @param {String} lastName
 * @param {String} brandInstagram
 */
function* createPartnerSubscription() {
  const {
    email,
    firstName,
    lastName,
    brandInstagram,
    source
  } = this.request.body;

  if (!email || !firstName) {
    this.throw(400, 'Missing required information');
  }

  try {
    yield MailChimp.subscribe(MAILCHIMP_LIST_ID_PARTNERS, email, {
      FNAME: firstName,
      LNAME: lastName,
      INSTA: brandInstagram,
      SOURCE: source
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
