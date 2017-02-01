'use strict';

const UsersDAO = require('../../dao/users');

function* attachRole(next) {
  if (this.state.userId) {
    const user = yield UsersDAO.findById(this.state.userId);
    this.state.role = user.role;
  }

  yield next;
}

module.exports = attachRole;
