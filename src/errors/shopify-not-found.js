"use strict";

/**
 * A requested Shopify resource was not found
 */
class ShopifyNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = "ShopifyNotFoundError";
  }
}

module.exports = ShopifyNotFoundError;
