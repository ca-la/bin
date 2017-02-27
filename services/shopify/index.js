'use strict';

const fetch = require('node-fetch');
const Promise = require('bluebird');
const querystring = require('querystring');

const ShopifyNotFoundError = require('../../errors/shopify-not-found');
const Logger = require('../logger');

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

function getCollectionMetafields(collectionId) {
  const url = `${SHOPIFY_STORE_BASE}/admin/custom_collections/${collectionId}/metafields.json`;

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
      return response.json();
    })
    .then((body) => {
      const fields = {};

      body.metafields.forEach((field) => {
        fields[`${field.namespace}.${field.key}`] = field.value;
      });

      return fields;
    });
}

function attachMetafields(collection) {
  return getCollectionMetafields(collection.id).then((metafields) => {
    return Object.assign({}, collection, { metafields });
  });
}

/**
 * Retrieve a list of collections
 */
function getCollections(filters) {
  const query = querystring.stringify(filters);
  const url = `${SHOPIFY_STORE_BASE}/admin/custom_collections.json?${query}`;

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
      return response.json();
    })
    .then((body) => {
      const collections = body.custom_collections;

      const sorted = collections.sort((a, b) => {
        return new Date(b.published_at) - new Date(a.published_at);
      });

      return Promise.all(sorted.map(attachMetafields));
    });
}

/**
 * Retrieve a set of products in a certain collection
 */
function getProductsByCollectionId(collectionId) {
  const url = `${SHOPIFY_STORE_BASE}/admin/products.json?collection_id=${collectionId}`;

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
      return response.json();
    })
    .then(body => body.products);
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
    })
    .then(body => body.order);
}

/**
 * Get a single product
 */
function getProductById(id) {
  const url = `${SHOPIFY_STORE_BASE}/admin/products/${id}.json`;

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
      if (
        response.status === 404 ||
        response.status === 400 // Invalid ID format
      ) {
        throw new ShopifyNotFoundError('Product not found');
      }

      return response.json();
    })
    .then((body) => {
      if (!body.product) {
        Logger.log('Shopify response: ', body);
        throw new Error('Shopify response did not contain product');
      }

      return body.product;
    });
}

function getAllProducts(filters) {
  const query = querystring.stringify(filters);

  const url = `${SHOPIFY_STORE_BASE}/admin/products.json?${query}`;

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
      return response.json();
    })
    .then((body) => {
      const products = body.products;

      // Exclude 'special' products - e.g. mens bomber - from public list
      return products.filter((product) => {
        return (
          product.product_type !== 'VIP' &&
          product.product_type !== 'Designer'
        );
      });
    });
}
/**
 * Get the number of orders that used a given discount code.
 */
function getRedemptionCount(discountCode) {
  // TODO allow calculation for more than 250
  // https://trello.com/c/FaTW4F4R/80-allow-referral-code-calculation-for-more-than-250-previous-orders
  const url = `${SHOPIFY_STORE_BASE}/admin/orders.json?limit=250`;

  return Promise.resolve()
    .then(() =>
      fetch(url, {
        method: 'get',
        headers: {
          Authorization: `Basic ${shopifyAuthHeader}`
        }
      })
    )
    .then(response => response.json())
    .then((body) => {
      if (!body.orders) {
        Logger.log('Shopify response: ', body);
        throw new Error('Could not retrieve Shopify orders');
      }

      return body.orders.reduce((memo, order) => {
        for (let i = 0; i < order.discount_codes.length; i += 1) {
          const code = order.discount_codes[i].code;

          if (code === discountCode) {
            return memo + 1;
          }
        }
        return memo;
      }, 0);
    });
}

module.exports = {
  getOrder,
  getCollections,
  getProductById,
  getAllProducts,
  getProductsByCollectionId,
  getRedemptionCount,
  login
};
