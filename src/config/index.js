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

const ADMIN_EMAIL = {
  [envs.LOCAL]: 'devops@ca.la',
  [envs.PROD]: 'hi@ca.la',
  [envs.STG]: 'hi@ca.la'
}[ENV];

const REQUIRE_CALA_EMAIL = {
  [envs.LOCAL]: false,
  [envs.PROD]: false,
  [envs.STG]: true
}[ENV];

/**
 * All environment variables are required for API functionality, unless stated
 * otherwise.
 * For local development, these values can be specified in a `.env` file in your
 * project root.
 * For live deployments, use `heroku config:set FOO=123 --app cala-api-prod`.
 */
const config = {
  REQUIRE_CALA_EMAIL,

  AWS_SCANPHOTO_BUCKET_NAME: process.env.AWS_SCANPHOTO_BUCKET_NAME,
  AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME: process.env.AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME,
  AWS_PRODUCT_DESIGN_IMAGE_BUCKET_REGION: process.env.AWS_PRODUCT_DESIGN_IMAGE_BUCKET_REGION,

  AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY,
  AWS_SECRET_KEY: process.env.AWS_SECRET_KEY,

  AWS_NOTIFICATION_SQS_URL: process.env.AWS_NOTIFICATION_SQS_URL,
  AWS_NOTIFICATION_SQS_REGION: process.env.AWS_NOTIFICATION_SQS_REGION,
  AWS_S3_THUMBNAIL_ACCESS_KEY: process.env.AWS_S3_THUMBNAIL_ACCESS_KEY,
  AWS_S3_THUMBNAIL_SECRET_KEY: process.env.AWS_S3_THUMBNAIL_SECRET_KEY,
  AWS_S3_THUMBNAIL_BUCKET_NAME: process.env.AWS_S3_THUMBNAIL_BUCKET_NAME,
  AWS_S3_THUMBNAIL_BUCKET_REGION: process.env.AWS_S3_THUMBNAIL_BUCKET_REGION,

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
  SITE_HOST: process.env.SITE_HOST,

  // e.g. 'https://studio.ca.la'
  STUDIO_HOST: process.env.STUDIO_HOST,

  // e.g. 'https://fit-client.ca.la'
  FIT_CLIENT_HOST: process.env.FIT_CLIENT_HOST,

  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,

  // The API key for our Rumbleship account offering 30/60 day financing
  RUMBLESHIP_API_KEY_FINANCING: process.env.RUMBLESHIP_API_KEY_FINANCING,

  // The API key for our Rumbleship account offering immediate ACH payments
  RUMBLESHIP_API_KEY_ACH: process.env.RUMBLESHIP_API_KEY_ACH,

  RUMBLESHIP_API_BASE: process.env.RUMBLESHIP_API_BASE,

  RUMBLESHIP_PAY_BASE: process.env.RUMBLESHIP_PAY_BASE,

  FINANCING_MARGIN: 0.06,

  LOG_ALL_QUERIES: (process.env.LOG_ALL_QUERIES === 'true'),

  ADMIN_EMAIL,

  CALA_ADMIN_USER_ID: process.env.CALA_ADMIN_USER_ID,

  CALA_OPS_USER_ID: process.env.CALA_OPS_USER_ID
};

Object.keys(config).forEach((key) => {
  const value = config[key];
  if (value === undefined || value === '') {
    throw new Error(`Missing config value: ${key}`);
  }
});

module.exports = config;
