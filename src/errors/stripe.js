'use strict';

const defaultResponse = {
  message: 'An unknown error occurred'
};

class StripeError extends Error {
  constructor(response = defaultResponse) {
    super(response.message);
    this.message = response.message;
    this.code = response.code;
    this.type = response.type;
    this.charge = response.charge;
    this.declineCode = response.decline_code;
    this.param = response.param;

    this.name = 'StripeError';
  }
}

module.exports = StripeError;
