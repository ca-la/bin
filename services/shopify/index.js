'use strict';

const fetch = require('node-fetch');
const Promise = require('bluebird');
const querystring = require('querystring');

const ShopifyNotFoundError = require('../../errors/shopify-not-found');
const InvalidDataError = require('../../errors/invalid-data');
const Logger = require('../logger');

const {
  SHOPIFY_STORE_BASE,
  SHOPIFY_STORE_AUTH
} = require('../config');

const shopifyAuthHeader = new Buffer(SHOPIFY_STORE_AUTH).toString('base64');

/**
 * @param {String|Object} error A Shopify `error` key
 */
function parseError(error) {
  switch (typeof error) {
    case 'string':
      return error;
    case 'object':
      return Object.keys(error)
        .map((key) => {
          const messages = error[key];
          return [].concat(messages)
            .map(message => `${key} ${message}`)
            .join(', ');
        })
        .join(', ');
    default:
      return error;
  }
}

function makeRequest(method, path, data) {
  const url = `${SHOPIFY_STORE_BASE}/admin${path}`;

  return Promise.resolve()
    .then(() => {
      const options = {
        method,
        headers: {
          Authorization: `Basic ${shopifyAuthHeader}`
        }
      };

      if (data) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(data);
      }

      return fetch(url, options);
    })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      const isJson = /application\/.*json/.test(contentType);

      if (!isJson) {
        return response.text().then((text) => {
          Logger.logServerError('Shopify request: ', method, url);
          Logger.logServerError('Shopify response: ', response.status, text);
          throw new Error(`Unexpected Shopify response type: ${contentType}`);
        });
      }

      return response.json();
    });
}

function getCollectionMetafields(collectionId) {
  const path = `/custom_collections/${collectionId}/metafields.json`;

  return makeRequest('get', path)
    .then((body) => {
      const fields = {};

      if (!body.metafields) {
        return {};
      }

      body.metafields.forEach((field) => {
        if (!fields[field.namespace]) {
          fields[field.namespace] = {};
        }

        fields[field.namespace][field.key] = field.value;
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
  const path = `/custom_collections.json?${query}`;

  return makeRequest('get', path)
    .then((body) => {
      const collections = body.custom_collections || [];

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
  const path = `/products.json?collection_id=${collectionId}&order=created_at+desc`;

  return makeRequest('get', path)
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

  const path = `/products.json?${query}`;

  return makeRequest('get', path)
    .then((body) => {
      const products = body.products;

      return products
        .filter((product) => {
          // Exclude 'special' products from public list
          return (
            product.product_type !== 'VIP' &&
            product.product_type !== 'Designer'
          );
        })
        .sort((a, b) => {
          // Sort by published_at desc
          return (new Date(b.published_at)) - (new Date(a.published_at));
        });
    });
}
/**
 * Get the number of orders that used a given discount code.
 */
function getRedemptionCount(discountCode) {
  // TODO allow calculation for more than 250
  // https://trello.com/c/FaTW4F4R/80-allow-referral-code-calculation-for-more-than-250-previous-orders
  const path = '/orders.json?limit=250';

  return makeRequest('get', path)
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

function createCustomer(data) {
  const { name, phone } = data;

  const [first, last] = name.split(' ');

  return makeRequest('post', '/customers.json', {
    customer: {
      first_name: first,
      last_name: last,
      phone
    }
  })
    .then((body) => {
      if (body.errors) {
        const errorMessage = parseError(body.errors);
        throw new InvalidDataError(errorMessage);
      }

      if (!body.customer) {
        Logger.log('Shopify response: ', body);
        throw new Error('Could not create Shopify customer');
      }

      return body.customer;
    });
}

module.exports = {
  createCustomer,
  parseError,
  getOrder,
  getCollections,
  getProductById,
  getAllProducts,
  getProductsByCollectionId,
  getRedemptionCount
};
