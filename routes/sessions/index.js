'use strict';

const Router = require('koa-router');

const InvalidDataError = require('../../errors/invalid-data');
const SessionsDAO = require('../../dao/sessions');

const router = new Router();

function* createSession() {
  const {
    email,
    password,
    expireAfterSeconds,
    role
  } = this.request.body;

  let expiresAt = null;

  if (expireAfterSeconds) {
    // This relies on the server and DB time being in sync, which is a bit
    // risky. TODO figured out a solution that does not, and avoid short
    // expirations until then.
    const now = (new Date()).getTime();
    expiresAt = new Date(now + (expireAfterSeconds * 1000));
  }

  const session = yield SessionsDAO.create({
    email,
    password,
    expiresAt,
    role
  })
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

function* deleteSession() {
  const numberDeleted = yield SessionsDAO.deleteById(this.params.sessionId);

  this.assert(numberDeleted === 1, 404, 'Session not found');

  this.status = 204;
  this.body = null;
}

router.post('/', createSession);
router.del('/:sessionId', deleteSession);
router.get('/:sessionId', getSession);

module.exports = router.routes();
