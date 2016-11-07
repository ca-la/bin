'use strict';

const router = require('koa-router')({
  prefix: '/users'
});

const UsersDAO = require('../../dao/users');

router.post('/', function* createUser() {
  const { name, zip, email, password } = this.state.body;

  this.assert(name && zip && email && password, 400, 'Missing required information');

  const user = yield UsersDAO.create({ name, zip, email, password });

  this.status = 201;
  this.body = user;
});

module.exports = router.routes();
