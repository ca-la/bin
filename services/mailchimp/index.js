'use strict';

const fetch = require('node-fetch');

const {
  MAILCHIMP_API_KEY,
  MAILCHIMP_LIST_ID_SUBSCRIPTIONS,
  MAILCHIMP_LIST_ID_PARTNERS,
  MAILCHIMP_LIST_ID_USERS
} = require('../config');

const MAILCHIMP_API_BASE = 'https://us13.api.mailchimp.com/3.0';
const MAILCHIMP_AUTH = new Buffer(`cala:${MAILCHIMP_API_KEY}`).toString('base64');

const ERROR_GLOSSARY = {
  'Member Exists': "You're already signed up for this list!"
};

function subscribe(listId, email, mergeFields) {
  const requestBody = {
    email_address: email,
    status: 'subscribed',
    merge_fields: mergeFields
  };

  let response;

  const url = `${MAILCHIMP_API_BASE}/lists/${listId}/members`;

  return fetch(url, {
    method: 'post',
    headers: {
      Authorization: `Basic ${MAILCHIMP_AUTH}`
    },
    body: JSON.stringify(requestBody)
  })
    .then((_response) => {
      response = _response;

      const contentType = response.headers.get('content-type');
      const isJson = (contentType && contentType.indexOf('application/json') > -1);

      return isJson ? response.json() : response.text();
    })
    .then((body) => {
      // eslint-disable-next-line no-console
      console.log('Mailchimp response: ', body);

      if (response.status !== 200) {
        const message = ERROR_GLOSSARY[body.title] || body.detail;

        throw new Error(message);
      }

      return body;
    });
}

function subscribeToSubscriptions({ email, name, zip }) {
  return subscribe(MAILCHIMP_LIST_ID_SUBSCRIPTIONS, email, {
    FULL_NAME: name,
    ZIP_CODE: zip
  });
}

function subscribeToPartners({ email, name, companyName, comments, source }) {
  return subscribe(MAILCHIMP_LIST_ID_PARTNERS, email, {
    NAME: name,
    ORGNAME: companyName,
    COMMENTS: comments,
    SOURCE: source
  });
}

function subscribeToUsers({ email, name, referralCode }) {
  return subscribe(MAILCHIMP_LIST_ID_USERS, email, {
    FULL_NAME: name,
    REF_CODE: referralCode
  });
}

module.exports = {
  subscribe,
  subscribeToPartners,
  subscribeToSubscriptions,
  subscribeToUsers
};
