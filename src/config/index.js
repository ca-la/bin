'use strict';

const envs = Object.freeze({
  DEMO: Symbol('demo'),
  LOCAL: Symbol('local'),
  PROD: Symbol('prod'),
  STG: Symbol('stg')
});

const ENV = envs[process.env.DEPLOYMENT_NAME] || envs.LOCAL;

const MINIMUM_SCAN_PITCH_RADIANS = {
  [envs.DEMO]: 1.35,
  [envs.LOCAL]: 1.35,
  [envs.PROD]: 1.35,
  [envs.STG]: 1.35
}[ENV];

const ADMIN_EMAIL = {
  [envs.DEMO]: 'hi@ca.la',
  [envs.LOCAL]: 'devops@ca.la',
  [envs.PROD]: 'hi@ca.la',
  [envs.STG]: 'hi@ca.la'
}[ENV];

const REQUIRE_CALA_EMAIL = {
  [envs.DEMO]: true,
  [envs.LOCAL]: false,
  [envs.PROD]: false,
  [envs.STG]: true
}[ENV];

const ENABLE_APOLLO_PLAYGROUND = {
  [envs.DEMO]: false,
  [envs.LOCAL]: true,
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
  ENABLE_APOLLO_PLAYGROUND,
  REQUIRE_CALA_EMAIL,

  AWS_SCANPHOTO_BUCKET_NAME: process.env.AWS_SCANPHOTO_BUCKET_NAME,

  AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY,
  AWS_SECRET_KEY: process.env.AWS_SECRET_KEY,

  AWS_NOTIFICATION_SQS_URL: process.env.AWS_NOTIFICATION_SQS_URL,
  AWS_NOTIFICATION_SQS_REGION: process.env.AWS_NOTIFICATION_SQS_REGION,

  AWS_S3_THUMBNAIL_ACCESS_KEY: process.env.AWS_S3_THUMBNAIL_ACCESS_KEY,
  AWS_S3_THUMBNAIL_SECRET_KEY: process.env.AWS_S3_THUMBNAIL_SECRET_KEY,
  AWS_S3_THUMBNAIL_BUCKET_NAME: process.env.AWS_S3_THUMBNAIL_BUCKET_NAME,
  AWS_S3_THUMBNAIL_BUCKET_REGION: process.env.AWS_S3_THUMBNAIL_BUCKET_REGION,

  AWS_IRIS_S3_BUCKET: process.env.AWS_IRIS_S3_BUCKET,
  AWS_IRIS_SQS_REGION: process.env.AWS_IRIS_SQS_REGION,
  AWS_IRIS_SQS_URL: process.env.AWS_IRIS_SQS_URL,

  AWS_USER_UPLOADS_BUCKET_NAME: process.env.AWS_USER_UPLOADS_BUCKET_NAME,
  AWS_USER_UPLOADS_BUCKET_REGION: process.env.AWS_USER_UPLOADS_BUCKET_REGION,
  USER_UPLOADS_BASE_URL: process.env.USER_UPLOADS_BASE_URL,

  MAILCHIMP_API_KEY: process.env.MAILCHIMP_API_KEY,

  // The Mailchimp list ID for interested designer/production partners
  MAILCHIMP_LIST_ID_PRODUCTION_PARTNERS:
    process.env.MAILCHIMP_LIST_ID_PRODUCTION_PARTNERS,
  MAILCHIMP_LIST_ID_DESIGNERS: process.env.MAILCHIMP_LIST_ID_DESIGNERS,

  // The Mailchimp list ID for users who have an account (i.e. are scanned)
  MAILCHIMP_LIST_ID_USERS: process.env.MAILCHIMP_LIST_ID_USERS,

  // e.g 'https://api.mailgun.net/v3/mailgun.ca.la'
  MAILGUN_API_BASE: process.env.MAILGUN_API_BASE,
  MAILGUN_API_KEY: process.env.MAILGUN_API_KEY,

  // e.g. 'https://ecom-31.myshopify.com'
  SHOPIFY_STORE_BASE: process.env.SHOPIFY_STORE_BASE,

  // API key and password separated by a colon, e.g. 'tok12345:password12345'
  SHOPIFY_STORE_AUTH: process.env.SHOPIFY_STORE_AUTH,
  SHOPIFY_CALA_APP_AUTH: process.env.SHOPIFY_CALA_APP_AUTH,

  TWILIO_SID: process.env.TWILIO_SID,

  TWILIO_TOKEN: process.env.TWILIO_TOKEN,

  TWILIO_OUTBOUND_NUMBER: process.env.TWILIO_OUTBOUND_NUMBER,

  TWILIO_PREREGISTRATION_OUTBOUND_NUMBER:
    process.env.TWILIO_PREREGISTRATION_OUTBOUND_NUMBER,

  MINIMUM_SCAN_PITCH_RADIANS,

  API_HOST: process.env.API_HOST,

  // e.g. 'https://ca.la'
  SITE_HOST: process.env.SITE_HOST,

  // e.g. 'https://app.ca.la'
  STUDIO_HOST: process.env.STUDIO_HOST,

  // e.g. 'https://fit-client.ca.la'
  FIT_CLIENT_HOST: process.env.FIT_CLIENT_HOST,

  // e.g. 'https://magic.ca.la'
  MAGIC_HOST: process.env.MAGIC_HOST,

  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,

  FINANCING_MARGIN: 0.06,

  LOG_ALL_QUERIES: process.env.LOG_ALL_QUERIES === 'true',

  ADMIN_EMAIL,

  CALA_OPS_USER_ID: process.env.CALA_OPS_USER_ID,

  MAX_DB_CONNECTION_POOL_SIZE:
    process.env.MAX_DB_CONNECTION_POOL_SIZE &&
    parseInt(process.env.MAX_DB_CONNECTION_POOL_SIZE, 10),

  DATABASE_URL: process.env.DATABASE_URL,

  USER_UPLOADS_IMGIX_URL: process.env.USER_UPLOADS_IMGIX_URL,

  DEFAULT_DESIGN_IDS: process.env.DEFAULT_DESIGN_IDS,

  RESOLVE_API_URL: process.env.RESOLVE_API_URL,

  FIT_PARTNER_SMS_PRODUCT_ID_BLACKLIST:
    process.env.FIT_PARTNER_SMS_PRODUCT_ID_BLACKLIST &&
    JSON.parse(process.env.FIT_PARTNER_SMS_PRODUCT_ID_BLACKLIST),

  SHORT_ID_SALT: process.env.SHORT_ID_SALT,
  UPC_SALT: process.env.UPC_SALT,

  AWS_HERMES_SQS_REGION: process.env.AWS_HERMES_SQS_REGION,
  AWS_HERMES_SQS_URL: process.env.AWS_HERMES_SQS_URL
};

Object.keys(config).forEach(key => {
  const value = config[key];
  if (value === undefined || value === '') {
    throw new Error(`Missing config value: ${key}`);
  }
});

module.exports = config;
