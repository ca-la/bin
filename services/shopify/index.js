'use strict';

const fetch = require('node-fetch');

const LOGIN_URL = 'https://shop.ca.la/account/login';
const LOGIN_SUCCESS_URL = 'https://shop.ca.la/account';
const LOGIN_FAILURE_URL = LOGIN_URL;

/**
 * Try to log a customer into the Shopify store, via the (non-public) endpoint
 * used on the site.
 * Parses the response redirect URL to determine whether we succeeded or failed.
 */
function login(email, password) {
  const requestBody = {
    customer: {
      email,
      password
    }
  };

  return fetch(LOGIN_URL, {
    headers: {
      'Content-Type': 'application/json'
    },
    method: 'post',
    redirect: 'manual',
    body: JSON.stringify(requestBody)
  })
    .then((response) => {
      const location = response.headers.get('location');

      if (location === LOGIN_SUCCESS_URL) {
        return true;
      } else if (location === LOGIN_FAILURE_URL) {
        throw new Error('Login failure');
      }

      throw new Error(`Unknown redirect URL: ${location}`);
    });
}

module.exports = {
  login
};
