'use strict';

/**
 * HTTP 403 Forbidden
 * Should only be thrown by middleware/routers - i.e. pieces of the stack
 * directly responsible for request/response cycle
 */
class ForbiddenError extends Error {
  constructor(message, code) {
    super(message);
    this.status = 403;
    this.code = code;
    this.message = message;
    this.name = 'ForbiddenError';
  }
}

module.exports = ForbiddenError;
