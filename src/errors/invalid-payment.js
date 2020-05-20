"use strict";

class InvalidPaymentError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
    this.message = message;
    this.name = "InvalidPaymentError";
  }
}

module.exports = InvalidPaymentError;
