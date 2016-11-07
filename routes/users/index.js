'use strict';

const router = require('koa-router')({
  prefix: '/users'
});

const InvalidDataError = require('../../errors/invalid-data');
const UsersDAO = require('../../dao/users');

router.post('/', function* createUser() {
  const { name, zip, email, password } = this.state.body;

  const user = yield UsersDAO.create({ name, zip, email, password })
    .catch(InvalidDataError, err => this.throw(400, err));

  this.status = 201;
  this.body = user;
});

module.exports = router.routes();
