'use strict';

const {
  FEATURED_PRODUCT_IDS_PROD,
  FEATURED_PRODUCT_IDS_DEV,
  FEATURED_COLLECTION_LISTS_DEV,
  FEATURED_COLLECTION_LISTS_PROD
} = require('./featured');

const envs = Object.freeze({
  LOCAL: Symbol('local'),
  PROD: Symbol('prod'),
  STG: Symbol('stg')
});

const ENV = envs[process.env.DEPLOYMENT_NAME] || envs.LOCAL;

const FEATURED_PRODUCT_IDS = {
  [envs.LOCAL]: FEATURED_PRODUCT_IDS_DEV,
  [envs.PROD]: FEATURED_PRODUCT_IDS_PROD,
  [envs.STG]: FEATURED_PRODUCT_IDS_DEV
}[ENV];

const FEATURED_COLLECTION_LISTS = {
  [envs.LOCAL]: FEATURED_COLLECTION_LISTS_DEV,
  [envs.PROD]: FEATURED_COLLECTION_LISTS_PROD,
  [envs.STG]: FEATURED_COLLECTION_LISTS_DEV
}[ENV];

const MINIMUM_SCAN_PITCH_RADIANS = {
  [envs.LOCAL]: 1.3,
  [envs.PROD]: 1.3,
  [envs.STG]: 1
}[ENV];

/**
 * All environment variables are required for API functionality, unless stated
 * otherwise.
 * For local development, these values can be specified in a `.env` file in your
 * project root.
 * For live deployments, use `heroku config:set FOO=123 --app cala-api-prod`.
 */
const config = {
  AWS_SCANPHOTO_BUCKET_NAME: process.env.AWS_SCANPHOTO_BUCKET_NAME,
  AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME: process.env.AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME,

  AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY,
  AWS_SECRET_KEY: process.env.AWS_SECRET_KEY,

  MAILCHIMP_API_KEY: process.env.MAILCHIMP_API_KEY,

  // The Mailchimp list ID for users who subscribe to the mailing list but do
  // not have an account yet.
  MAILCHIMP_LIST_ID_SUBSCRIPTIONS: process.env.MAILCHIMP_LIST_ID_SUBSCRIPTIONS,

  // The Mailchimp list ID for interested designer/brand partners
  MAILCHIMP_LIST_ID_PARTNERS: process.env.MAILCHIMP_LIST_ID_PARTNERS,

  // The Mailchimp list ID for users who have an account (i.e. are scanned)
  MAILCHIMP_LIST_ID_USERS: process.env.MAILCHIMP_LIST_ID_USERS,

  // e.g 'https://api.mailgun.net/v3/mailgun.ca.la'
  MAILGUN_API_BASE: process.env.MAILGUN_API_BASE,
  MAILGUN_API_KEY: process.env.MAILGUN_API_KEY,

  // e.g. 'https://ecom-31.myshopify.com'
  SHOPIFY_STORE_BASE: process.env.SHOPIFY_STORE_BASE,

  // API key and password separated by a colon, e.g. 'tok12345:password12345'
  SHOPIFY_STORE_AUTH: process.env.SHOPIFY_STORE_AUTH,

  FEATURED_PRODUCT_IDS,

  FEATURED_COLLECTION_LISTS,

  REFERRAL_VALUE_DOLLARS: 50,

  TWILIO_SID: process.env.TWILIO_SID,

  TWILIO_TOKEN: process.env.TWILIO_TOKEN,

  TWILIO_OUTBOUND_NUMBER: process.env.TWILIO_OUTBOUND_NUMBER,

  TWILIO_PREREGISTRATION_OUTBOUND_NUMBER: process.env.TWILIO_PREREGISTRATION_OUTBOUND_NUMBER,

  MINIMUM_SCAN_PITCH_RADIANS,

  API_HOST: process.env.API_HOST,

  // e.g. 'https://ca.la'
  SITE_HOST: process.env.SITE_HOST
};

Object.keys(config).forEach((key) => {
  if (!config[key]) {
    throw new Error(`Missing config value: ${key}`);
  }
});

module.exports = config;
