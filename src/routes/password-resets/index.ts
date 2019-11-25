import Router from 'koa-router';

import SessionsDAO from '../../dao/sessions';
import * as UsersDAO from '../../components/users/dao';
import passwordReset from '../../emails/password-reset';
import { sendSynchronouslyDeprecated } from '../../services/email';

const router = new Router();

/**
 * POST /password-resets
 *
 * "Create" a password reset, i.e. create a new session and send a user an email
 * to reset their password.
 * @param {String} email
 */
function* sendReset(this: PublicContext): Iterator<any, any, any> {
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

  yield sendSynchronouslyDeprecated(
    user.email,
    'CALA Password Reset',
    emailTemplate
  );

  this.status = 204;
}

router.post('/', sendReset);

export = router.routes();
