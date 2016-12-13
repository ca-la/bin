'use strict';

const Promise = require('bluebird');
const fetch = require('node-fetch');
const ShopifyNotFoundError = require('../../errors/shopify-not-found');

const {
  SHOPIFY_STORE_BASE,
  SHOPIFY_STORE_AUTH
} = require('../config');

const LOGIN_URL = 'https://shop.ca.la/account/login';
const LOGIN_SUCCESS_URL = 'https://shop.ca.la/account';
const LOGIN_FAILURE_URL = LOGIN_URL;

const shopifyAuthHeader = new Buffer(SHOPIFY_STORE_AUTH).toString('base64');

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

  return Promise.resolve()
    .then(() =>
      fetch(LOGIN_URL, {
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'post',
        redirect: 'manual',
        body: JSON.stringify(requestBody)
      })
    )
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

/**
 * Retrieve a single order by ID
 */
function getOrder(id) {
  const url = `${SHOPIFY_STORE_BASE}/admin/orders/${id}.json`;

  return Promise.resolve()
    .then(() =>
      fetch(url, {
        method: 'get',
        headers: {
          Authorization: `Basic ${shopifyAuthHeader}`
        }
      })
    )
    .then((response) => {
      if (response.status === 404) {
        throw new ShopifyNotFoundError('Order not found');
      }

      return response.json();
    });
}

module.exports = {
  getOrder,
  login
};
