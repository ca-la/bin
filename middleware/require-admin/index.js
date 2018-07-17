'use strict';

const User = require('../../domain-objects/user');

function* requireAdmin(next) {
  this.assert(this.state.role === User.ROLES.admin, 403);

  yield next;
}

module.exports = requireAdmin;
