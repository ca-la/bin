'use strict';

const fetch = require('node-fetch');
const crypto = require('crypto');

const InvalidDataError = require('../../errors/invalid-data');
const { logServerError } = require('../logger');

const {
  MAILCHIMP_API_KEY,
  MAILCHIMP_LIST_ID_SUBSCRIPTIONS,
  MAILCHIMP_LIST_ID_USERS
} = require('../../config');

const MAILCHIMP_API_BASE = 'https://us13.api.mailchimp.com/3.0';
const MAILCHIMP_AUTH = Buffer.from(`cala:${MAILCHIMP_API_KEY}`).toString('base64');

const ERROR_GLOSSARY = {
  'Member Exists': "You're already signed up for this list!"
};

function md5(string) {
  return crypto
    .createHash('md5')
    .update(string)
    .digest('hex');
}

function makeRequest(method, path, requestBody) {
  let response;

  const url = `${MAILCHIMP_API_BASE}${path}`;

  return fetch(url, {
    method,
    headers: {
      Authorization: `Basic ${MAILCHIMP_AUTH}`
    },
    body: JSON.stringify(requestBody)
  })
    .then((_response) => {
      response = _response;

      const contentType = response.headers.get('content-type');
      const isJson = /application\/.*json/.test(contentType);

      if (!isJson) {
        return response.text().then((text) => {
          logServerError('Mailchimp request: ', method, url, requestBody);
          logServerError('Mailchimp response: ', response.status, text);
          throw new Error(`Unexpected Mailchimp response type: ${contentType}`);
        });
      }

      return response.json();
    })
    .then((body) => {
      // eslint-disable-next-line no-console
      console.log('Mailchimp response: ', response.status, body);

      if (response.status !== 200) {
        const message = ERROR_GLOSSARY[body.title] || body.detail;

        throw new InvalidDataError(message);
      }

      return body;
    });
}

function subscribe(listId, email, mergeFields) {
  const requestBody = {
    email_address: email,
    status: 'subscribed',
    merge_fields: mergeFields
  };

  const path = `/lists/${listId}/members`;

  return makeRequest('post', path, requestBody);
}

function update(listId, email, mergeFields) {
  const hash = md5(email);

  const requestBody = {
    merge_fields: mergeFields
  };

  const path = `/lists/${listId}/members/${hash}`;

  return makeRequest('patch', path, requestBody);
}

function subscribeToSubscriptions({ email, name, zip }) {
  return subscribe(MAILCHIMP_LIST_ID_SUBSCRIPTIONS, email, {
    FULL_NAME: name,
    ZIP_CODE: zip
  });
}

function subscribeToUsers({
  email,
  name,
  referralCode,
  cohort
}) {
  const tags = {
    FULL_NAME: name,
    REF_CODE: referralCode,
    HAS_BOUGHT: 'false',
    HAS_SCAN: 'false'
  };

  if (cohort) {
    Object.assign(tags, { COHORT: cohort });
  }

  return subscribe(MAILCHIMP_LIST_ID_USERS, email, tags);
}

function updateUser({
  email,
  hasScan,
  hasBought,
  cohort
}) {
  const data = {};

  if (hasScan !== undefined) {
    Object.assign(data, { HAS_SCAN: String(hasScan) });
  }

  if (hasBought !== undefined) {
    Object.assign(data, { HAS_BOUGHT: String(hasBought) });
  }

  if (cohort) {
    Object.assign(data, { COHORT: cohort });
  }

  return update(MAILCHIMP_LIST_ID_USERS, email, data);
}

module.exports = {
  subscribe,
  subscribeToSubscriptions,
  subscribeToUsers,
  updateUser
};
