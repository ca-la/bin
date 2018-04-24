'use strict';

const fetch = require('node-fetch');
const Promise = require('bluebird');
const querystring = require('querystring');

const InvalidDataError = require('../../errors/invalid-data');
const Logger = require('../logger');
const ShopifyNotFoundError = require('../../errors/shopify-not-found');
const { requireValues } = require('../../services/require-properties');

const {
  SHOPIFY_STORE_AUTH,
  SHOPIFY_STORE_BASE
} = require('../../config');

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

class ShopifyClient {
  constructor({ storeBase, appApiKey, appPassword }) {
    requireValues({ storeBase, appApiKey, appPassword });
    this.storeBase = storeBase;
    this.appApiKey = appApiKey;
    this.appPassword = appPassword;
  }

  makeRequest(method, path, data) {
    const url = `${this.storeBase}/admin${path}`;

    const auth = `${this.appApiKey}:${this.appPassword}`;
    const shopifyAuthHeader = new Buffer(auth).toString('base64');

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

  getCollectionMetafields(collectionId) {
    const path = `/custom_collections/${collectionId}/metafields.json`;

    return this.makeRequest('get', path)
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

  attachMetafields(collection) {
    return this.getCollectionMetafields(collection.id).then((metafields) => {
      return Object.assign({}, collection, { metafields });
    });
  }

  /**
  * Retrieve a list of collections
  */
  getCollections(filters) {
    const query = querystring.stringify(filters);
    const path = `/custom_collections.json?${query}`;

    return this.makeRequest('get', path)
      .then((body) => {
        const collections = body.custom_collections || [];

        const sorted = collections.sort((a, b) => {
          return new Date(b.published_at) - new Date(a.published_at);
        });

        return Promise.all(sorted.map(this.attachMetafields));
      });
  }

  /**
  * Retrieve a list of "collects" - Shopify's join table between products and
  * collections
  */
  getCollects(filters) {
    const query = querystring.stringify(filters);
    const path = `/collects.json?${query}`;

    return this.makeRequest('get', path)
      .then((body) => {
        return body.collects || [];
      });
  }

  /**
  * Retrieve a set of products in a certain collection
  */
  getProductsByCollectionId(collectionId) {
    const path = `/products.json?collection_id=${collectionId}&order=created_at+desc`;

    return this.makeRequest('get', path)
      .then(body => body.products);
  }

  /**
  * Retrieve a single order by ID
  */
  async getOrder(id) {
    const path = `/orders/${id}.json`;

    const body = await this.makeRequest('get', path);

    if (!body.order) {
      Logger.log('Shopify response: ', body);
      throw new Error('Shopify response did not contain order');
    }

    return body.order;
  }

  /**
  * Get a single product
  */
  async getProductById(id) {
    const path = `/products/${id}.json`;

    const body = await this.makeRequest('get', path);

    if (!body.product) {
      Logger.log('Shopify response: ', body);
      throw new Error('Shopify response did not contain product');
    }

    return body.product;
  }

  getAllProducts(filters, { includeDesigners = false }) {
    const query = querystring.stringify(filters);

    const path = `/products.json?${query}`;

    return this.makeRequest('get', path)
      .then((body) => {
        const products = body.products;

        if (!products) {
          Logger.log('Shopify response: ', body);
          throw new Error('Shopify response did not contain products');
        }

        return products
          .filter((product) => {
            // Exclude 'special' products from public list
            // ... unless you're filtering by handle specifically
            // probably want to reevaluate this and add a `getByHandle` endpoint
            // b/c this is weird
            if (
              !filters.handle && (
                product.product_type === 'VIP' ||
                product.product_type === 'Hidden'
              )
            ) return false;

            if (
              !includeDesigners &&
              product.product_type === 'Designer'
            ) return false;

            return true;
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
  getRedemptionCount(discountCode) {
    // TODO allow calculation for more than 250
    // https://trello.com/c/FaTW4F4R/80-allow-referral-code-calculation-for-more-than-250-previous-orders
    const path = '/orders.json?limit=250';

    return this.makeRequest('get', path)
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

  /**
  * @param {String} data.name Customer's full name
  * @param {String} data.phone Customer's phone number
  * @returns {Object} customer data
  */
  createCustomer(data) {
    const { name, phone } = data;

    const [first, last] = name.split(' ');

    return this.makeRequest('post', '/customers.json', {
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

  getCustomerByPhone(phone) {
    return this.makeRequest('get', `/customers/search.json?query=${phone}`)
      .then((body) => {
        if (!body.customers) {
          Logger.log('Shopify response: ', body);
          throw new Error('Could not list Shopify customers');
        }

        const customer = body.customers.find(c => c.phone === phone);

        if (!customer) {
          throw new ShopifyNotFoundError('No matching customer found');
        }

        return customer;
      });
  }

  updateCustomer(customerId, data) {
    return this.makeRequest('put', `/customers/${customerId}.json`, {
      customer: data
    })
      .then((body) => {
        if (!body.customer) {
          Logger.log('Shopify response: ', body);
          throw new Error('Could not update Shopify customer');
        }

        return body.customer;
      });
  }

  updateCustomerByPhone(phone, data) {
    return this.getCustomerByPhone(phone)
      .then((customer) => {
        return this.updateCustomer(customer.id, data);
      });
  }
}

const calaCredentials = SHOPIFY_STORE_AUTH.split(':');

ShopifyClient.CALA_STORE_CREDENTIALS = {
  storeBase: SHOPIFY_STORE_BASE,
  appApiKey: calaCredentials[0],
  appPassword: calaCredentials[1]
};

module.exports = ShopifyClient;
