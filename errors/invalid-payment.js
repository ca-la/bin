'use strict';

class InvalidPaymentError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = 'InvalidPaymentError';
  }
}

module.exports = InvalidPaymentError;
