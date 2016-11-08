'use strict';

const fetch = require('node-fetch');

const {
  MAILCHIMP_LIST_ID,
  MAILCHIMP_API_KEY
} = require('../config');

const MAILCHIMP_API_BASE = 'https://us13.api.mailchimp.com/3.0';
const MAILCHIMP_AUTH = new Buffer(`cala:${MAILCHIMP_API_KEY}`).toString('base64');

const ERROR_GLOSSARY = {
  'Member Exists': "You're already signed up for this list!"
};

function subscribe({ email, name, zip }) {
  const requestBody = {
    email_address: email,
    status: 'subscribed',
    merge_fields: {
      FULL_NAME: name,
      ZIP_CODE: zip
    }
  };

  let response;

  const url = `${MAILCHIMP_API_BASE}/lists/${MAILCHIMP_LIST_ID}/members`;

  return fetch(url, {
    method: 'post',
    headers: {
      Authorization: `Basic ${MAILCHIMP_AUTH}`
    },
    body: JSON.stringify(requestBody)
  })
    .then((_response) => {
      response = _response;
      return response.json();
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

module.exports = {
  subscribe
};
