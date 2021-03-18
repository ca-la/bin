"use strict";

/**
 * HTTP 401 Unauthorized
 * Should only be thrown by middleware/routers - i.e. pieces of the stack
 * directly responsible for request/response cycle
 */
class UnauthorizedError extends Error {
  constructor(message, code) {
    super(message);
    this.status = 403;
    this.code = code;
    this.message = message;
    this.name = "UnauthorizedError";
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

module.exports = UnauthorizedError;
