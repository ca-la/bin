'use strict';

/**
 * All environment variables are required for API functionality, unless stated
 * otherwise.
 * For local development, these values can be specified in a `.env` file in your
 * project root.
 * For live deployments, use `heroku config:set FOO=123 --app cala-api-prod`.
 */
const config = {
  MAILCHIMP_API_KEY: process.env.MAILCHIMP_API_KEY,

  // The Mailchimp list ID for users who subscribe to the mailing list but do
  // not have an account yet.
  MAILCHIMP_LIST_ID_SUBSCRIPTIONS: process.env.MAILCHIMP_LIST_ID_SUBSCRIPTIONS,

  // The Mailchimp list ID for users who have an account (i.e. are scanned)
  MAILCHIMP_LIST_ID_USERS: process.env.MAILCHIMP_LIST_ID_USERS,

  MAILGUN_API_BASE: process.env.MAILGUN_API_BASE,
  MAILGUN_API_KEY: process.env.MAILGUN_API_KEY
};

Object.keys(config).forEach((key) => {
  if (!config[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
});

module.exports = config;
