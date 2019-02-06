'use strict';

const Router = require('koa-router');

const MailChimp = require('../../services/mailchimp');
const { MAILCHIMP_LIST_ID_DESIGNERS, MAILCHIMP_LIST_ID_PRODUCTION_PARTNERS } = require('../../config');

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
 * POST /subscriptions/designers
 * DEPRECATED: POST /subscriptions/partners
 * @param {String} email
 * @param {String} firstName
 * @param {String} lastName
 * @param {String} brandInstagram
 * @param {String} language
 * @param {String} readyToGo
 */
function* createDesignerSubscription() {
  const {
    brandInstagram,
    email,
    firstName,
    language,
    lastName,
    readyToGo,
    source
  } = this.request.body;

  if (!email || !firstName) {
    this.throw(400, 'Missing required information');
  }

  try {
    yield MailChimp.subscribe(MAILCHIMP_LIST_ID_DESIGNERS, email, {
      FNAME: firstName,
      INSTA: brandInstagram,
      LANGUAGE: language,
      LNAME: lastName,
      SOURCE: source,
      READYTOGO: readyToGo
    });
  } catch (error) {
    this.throw(400, error.message);
  }

  this.status = 201;
  this.body = { success: true };
}

/**
 * POST /subscriptions/production-partners
 * @param {String} email
 * @param {String} name
 * @param {String} website
 * @param {String} source
 * @param {String} language
 */
function* createPartnerSubscription() {
  const {
    email,
    language,
    name,
    source,
    website
  } = this.request.body;

  if (!email || !name) {
    this.throw(400, 'Missing required information');
  }

  try {
    yield MailChimp.subscribe(MAILCHIMP_LIST_ID_PRODUCTION_PARTNERS, email, {
      LANGUAGE: language,
      NAME: name,
      SOURCE: source,
      WEB: website
    });
  } catch (error) {
    this.throw(400, error.message);
  }

  this.status = 201;
  this.body = { success: true };
}

router.post('/', createSubscription);
router.post('/designers', createDesignerSubscription);
router.post('/production-partners', createPartnerSubscription);

// DEPRECATED
router.post('/partners', createDesignerSubscription);

module.exports = router.routes();
