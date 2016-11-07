'use strict';

const router = require('koa-router')({
  prefix: '/sessions'
});

const InvalidDataError = require('../../errors/invalid-data');
const SessionsDAO = require('../../dao/sessions');

router.post('/', function* createSession() {
  const { email, password } = this.state.body;

  const session = yield SessionsDAO.create({ email, password })
    .catch(InvalidDataError, err => this.throw(400, err));

  this.status = 201;
  this.body = session;
});

module.exports = router.routes();
