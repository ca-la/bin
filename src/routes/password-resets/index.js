'use strict';

const Router = require('koa-router');

const SessionsDAO = require('../../dao/sessions');
const UsersDAO = require('../../dao/users');
const passwordReset = require('../../emails/password-reset');
const { sendSynchronouslyDeprecated } = require('../../services/email');

const router = new Router();

/**
 * POST /password-resets
 *
 * "Create" a password reset, i.e. create a new session and send a user an email
 * to reset their password.
 * @param {String} email
 */
function* sendReset() {
  const { email } = this.request.body;

  if (!email) {
    this.throw(400, 'Missing required information');
  }

  const user = yield UsersDAO.findByEmail(email);
  this.assert(user, 400, 'User not found');

  const session = yield SessionsDAO.createForUser(user);

  const emailTemplate = passwordReset({
    sessionId: session.id,
    name: user.name
  });

  yield sendSynchronouslyDeprecated(user.email, 'CALA Password Reset', emailTemplate);

  this.status = 201;
  this.body = { success: true };
}

router.post('/', sendReset);

module.exports = router.routes();
