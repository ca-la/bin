"use strict";

function* requireAuth(next) {
  this.assert(
    this.state.userId,
    401,
    "Authorization is required to access this resource"
  );

  yield next;
}

module.exports = requireAuth;
