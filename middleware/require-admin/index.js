'use strict';

const UsersDAO = require('../../dao/users');
const User = require('../../domain-objects/user');

function* requireAdmin(next) {
  this.assert(this.state.userId, 500, 'requireAdmin should always be chained off requireAuth');

  const user = yield UsersDAO.findById(this.state.userId);

  this.assert(user.role === User.ROLES.admin, 403, 'You do not have access to this resource');

  yield next;
}

module.exports = requireAdmin;
