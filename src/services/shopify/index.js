"use strict";

const fetch = require("node-fetch");
const bindAll = require("lodash/bindAll");

const InvalidDataError = require("../../errors/invalid-data");
const Logger = require("../logger");
const ShopifyNotFoundError = require("../../errors/shopify-not-found");
const { requireValues } = require("../../services/require-properties");

const { SHOPIFY_STORE_AUTH, SHOPIFY_STORE_BASE } = require("../../config");

/**
 * @param {String|Object} error A Shopify `error` key
 */
function parseError(error) {
  switch (typeof error) {
    case "string":
      return error;
    case "object":
      return Object.keys(error)
        .map((key) => {
          const messages = error[key];
          return []
            .concat(messages)
            .map((message) => `${key} ${message}`)
            .join(", ");
        })
        .join(", ");
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

    bindAll(this, "_attachMetafields");
  }

  async makeRequest(method, path, data) {
    const url = `${this.storeBase}/admin${path}`;
    Logger.log(`Making Shopify request: ${method} ${url}`);

    const auth = `${this.appApiKey}:${this.appPassword}`;
    const shopifyAuthHeader = Buffer.from(auth).toString("base64");

    const options = {
      method,
      headers: {
        Authorization: `Basic ${shopifyAuthHeader}`,
      },
    };

    if (data) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const contentType = response.headers.get("content-type");
    const isJson = /application\/.*json/.test(contentType);

    if (!isJson) {
      const text = await response.text();
      Logger.logServerError("Shopify request: ", method, url);
      Logger.logServerError("Shopify response: ", response.status, text);
      throw new Error(`Unexpected Shopify response type: ${contentType}`);
    }

    const json = await response.json();
    return [json, response];
  }

  async getCollectionMetafields(collectionId) {
    const path = `/custom_collections/${collectionId}/metafields.json`;

    const [body] = await this.makeRequest("get", path);
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

  async getCustomerMetafields(customerId) {
    const path = `/customers/${customerId}/metafields.json?limit=250`;

    const [body] = await this.makeRequest("get", path);

    return body.metafields || [];
  }

  async deleteMetafield(metafieldId) {
    const path = `/metafields/${metafieldId}.json`;

    await this.makeRequest("delete", path);
  }

  async _attachMetafields(collection) {
    const metafields = await this.getCollectionMetafields(collection.id);
    return Object.assign({}, collection, { metafields });
  }

  /**
   * @param {String} data.name Customer's full name
   * @param {String} data.phone Customer's phone number
   * @returns {Object} customer data
   */
  async createCustomer(data) {
    const { name, phone } = data;

    const [first, last] = name.split(" ");

    const [body] = await this.makeRequest("post", "/customers.json", {
      customer: {
        first_name: first,
        last_name: last,
        phone,
      },
    });

    if (body.errors) {
      const errorMessage = parseError(body.errors);
      throw new InvalidDataError(errorMessage);
    }

    if (!body.customer) {
      Logger.log("Shopify response: ", body);
      throw new Error("Could not create Shopify customer");
    }

    return body.customer;
  }

  async getCustomerByPhone(phone) {
    const [body] = await this.makeRequest(
      "get",
      `/customers/search.json?query=${phone}`
    );

    if (!body.customers) {
      Logger.log("Shopify response: ", body);
      throw new Error("Could not list Shopify customers");
    }

    const customer = body.customers.find((c) => c.phone === phone);

    if (!customer) {
      throw new ShopifyNotFoundError("No matching customer found");
    }

    return customer;
  }

  async updateCustomer(customerId, data) {
    const [body] = await this.makeRequest(
      "put",
      `/customers/${customerId}.json`,
      {
        customer: data,
      }
    );

    Logger.log(
      `Updated Shopify customer ${customerId} on store ${this.storeBase} with data:`,
      data
    );
    Logger.log("Response:", body);

    if (!body.customer) {
      Logger.log("Shopify response: ", body);
      throw new Error("Could not update Shopify customer");
    }

    return body.customer;
  }
}

const calaCredentials = SHOPIFY_STORE_AUTH.split(":");

ShopifyClient.CALA_STORE_CREDENTIALS = {
  storeBase: SHOPIFY_STORE_BASE,
  appApiKey: calaCredentials[0],
  appPassword: calaCredentials[1],
};

ShopifyClient.parseError = parseError;

module.exports = ShopifyClient;
