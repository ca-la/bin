import Router from "koa-router";

import SessionsDAO from "../../dao/sessions";
import Session from "../../domain-objects/session";
import * as UsersDAO from "../../components/users/dao";
import { enqueueSend } from "../../services/email";
import { STUDIO_HOST } from "../../config";

const router = new Router();

/**
 * POST /password-resets
 *
 * "Create" a password reset, i.e. create a new session and send a user an email
 * to reset their password.
 * @param {String} email
 */
function* sendReset(
  this: PublicContext<{ email?: string }>
): Iterator<any, any, any> {
  const { email } = this.request.body;

  if (!email) {
    this.throw(400, "Missing required information");
  }

  const user = yield UsersDAO.findByEmail(email);
  this.assert(user, 400, "User not found");

  const session: Session = yield SessionsDAO.createForUser(user);

  const resetUrl = `${STUDIO_HOST}/password-reset?sessionId=${session.id}`;

  yield enqueueSend({
    to: user.email,
    params: {
      resetUrl,
    },
    templateName: "password_reset",
  });

  this.status = 204;
}

router.post("/", sendReset);

export = router.routes();
