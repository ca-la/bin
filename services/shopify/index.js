'use strict';

const fetch = require('node-fetch');
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

  async makeRequest(method, path, data) {
    const url = `${this.storeBase}/admin${path}`;

    const auth = `${this.appApiKey}:${this.appPassword}`;
    const shopifyAuthHeader = new Buffer(auth).toString('base64');

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

    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type');
    const isJson = /application\/.*json/.test(contentType);

    if (!isJson) {
      const text = await response.text();
      Logger.logServerError('Shopify request: ', method, url);
      Logger.logServerError('Shopify response: ', response.status, text);
      throw new Error(`Unexpected Shopify response type: ${contentType}`);
    }

    const json = await response.json();
    return [json, response];
  }

  async getCollectionMetafields(collectionId) {
    const path = `/custom_collections/${collectionId}/metafields.json`;

    const [body] = await this.makeRequest('get', path);
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
  }

  async attachMetafields(collection) {
    const metafields = await this.getCollectionMetafields(collection.id);
    return Object.assign({}, collection, { metafields });
  }

  /**
  * Retrieve a list of collections
  */
  async getCollections(filters) {
    const query = querystring.stringify(filters);
    const path = `/custom_collections.json?${query}`;

    const [body] = await this.makeRequest('get', path);
    const collections = body.custom_collections || [];

    const sorted = collections.sort((a, b) => {
      return new Date(b.published_at) - new Date(a.published_at);
    });

    return Promise.all(sorted.map(this.attachMetafields));
  }

  /**
  * Retrieve a list of "collects" - Shopify's join table between products and
  * collections
  */
  async getCollects(filters) {
    const query = querystring.stringify(filters);
    const path = `/collects.json?${query}`;

    const [body] = await this.makeRequest('get', path);
    return body.collects || [];
  }

  /**
  * Retrieve a set of products in a certain collection
  */
  async getProductsByCollectionId(collectionId) {
    const path = `/products.json?collection_id=${collectionId}&order=created_at+desc`;

    const [body] = await this.makeRequest('get', path);
    return body.products;
  }

  /**
  * Retrieve a single order by ID
  */
  async getOrder(id) {
    const path = `/orders/${id}.json`;

    const [body, response] = await this.makeRequest('get', path);

    if (response.status === 404) {
      throw new ShopifyNotFoundError('Order not found');
    }

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

    const [body, response] = await this.makeRequest('get', path);

    if (response.status === 404) {
      throw new ShopifyNotFoundError('Product not found');
    }

    if (!body.product) {
      Logger.log('Shopify response: ', body);
      throw new Error('Shopify response did not contain product');
    }

    return body.product;
  }

  async getAllProducts(filters, { includeDesigners = false }) {
    const query = querystring.stringify(filters);

    const path = `/products.json?${query}`;

    const [body] = await this.makeRequest('get', path);
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
  }

  /**
  * Get the number of orders that used a given discount code.
  */
  async getRedemptionCount(discountCode) {
    // TODO allow calculation for more than 250
    // https://trello.com/c/FaTW4F4R/80-allow-referral-code-calculation-for-more-than-250-previous-orders
    const path = '/orders.json?limit=250';

    const [body] = await this.makeRequest('get', path);

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
  }

  /**
  * @param {String} data.name Customer's full name
  * @param {String} data.phone Customer's phone number
  * @returns {Object} customer data
  */
  async createCustomer(data) {
    const { name, phone } = data;

    const [first, last] = name.split(' ');

    const [body] = await this.makeRequest('post', '/customers.json', {
      customer: {
        first_name: first,
        last_name: last,
        phone
      }
    });

    if (body.errors) {
      const errorMessage = parseError(body.errors);
      throw new InvalidDataError(errorMessage);
    }

    if (!body.customer) {
      Logger.log('Shopify response: ', body);
      throw new Error('Could not create Shopify customer');
    }

    return body.customer;
  }

  async getCustomerByPhone(phone) {
    const [body] = await this.makeRequest('get', `/customers/search.json?query=${phone}`);

    if (!body.customers) {
      Logger.log('Shopify response: ', body);
      throw new Error('Could not list Shopify customers');
    }

    const customer = body.customers.find(c => c.phone === phone);

    if (!customer) {
      throw new ShopifyNotFoundError('No matching customer found');
    }

    return customer;
  }

  async updateCustomer(customerId, data) {
    const [body] = await this.makeRequest('put', `/customers/${customerId}.json`, {
      customer: data
    });

    if (!body.customer) {
      Logger.log('Shopify response: ', body);
      throw new Error('Could not update Shopify customer');
    }

    return body.customer;
  }

  async updateCustomerByPhone(phone, data) {
    const customer = await this.getCustomerByPhone(phone);
    const updated = await this.updateCustomer(customer.id, data);
    return updated;
  }
}

const calaCredentials = SHOPIFY_STORE_AUTH.split(':');

ShopifyClient.CALA_STORE_CREDENTIALS = {
  storeBase: SHOPIFY_STORE_BASE,
  appApiKey: calaCredentials[0],
  appPassword: calaCredentials[1]
};

ShopifyClient.parseError = parseError;

module.exports = ShopifyClient;
