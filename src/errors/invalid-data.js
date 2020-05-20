"use strict";

/**
 * User-provided data was missing or invalid.
 */
class InvalidDataError extends Error {
  constructor(message, code) {
    super(message);
    this.status = 400;
    this.code = code;
    this.message = message;
    this.name = "InvalidDataError";
  }
}

module.exports = InvalidDataError;
