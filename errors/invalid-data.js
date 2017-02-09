'use strict';

/**
 * User-provided data was missing or invalid.
 */
class InvalidDataError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
    this.message = message;
    this.name = 'InvalidDataError';
  }
}

module.exports = InvalidDataError;
