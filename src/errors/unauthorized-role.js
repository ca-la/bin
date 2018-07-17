'use strict';

/**
 * A user tried to assume a role that they're not eligible for
 */
class UnauthorizedRoleError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.message = message;
    this.name = 'UnauthorizedRoleError';
  }
}

module.exports = UnauthorizedRoleError;
