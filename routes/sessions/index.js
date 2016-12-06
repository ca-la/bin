'use strict';

const router = require('koa-router')({
  prefix: '/sessions'
});

const InvalidDataError = require('../../errors/invalid-data');
const SessionsDAO = require('../../dao/sessions');

function* createSession() {
  const { email, password } = this.state.body;

  const session = yield SessionsDAO.create({ email, password })
    .catch(InvalidDataError, err => this.throw(400, err));

  this.status = 201;
  this.body = session;
}

function* getSession() {
  const session = yield SessionsDAO.findById(this.params.sessionId, true);

  this.assert(session, 404, 'Session not found');

  this.status = 200;
  this.body = session;
}

router.post('/', createSession);
router.get('/:sessionId', getSession);

module.exports = router.routes();
