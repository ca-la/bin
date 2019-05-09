import * as Router from 'koa-router';
import * as Koa from 'koa';
import requireAuth = require('../../middleware/require-auth');

const router = new Router();

interface NotificationAccessQuery {
  userId?: string;
}

/**
 * Checks the state's userId against the query param's userId;
 * Responds with a 200 if there's a match, otherwise throws a 400.
 */
function* getNotificationAccess(this: Koa.Application.Context): AsyncIterableIterator<any> {
  const { userId } = this.state;
  const { userId: checkUserId }: NotificationAccessQuery = this.query;

  if (userId !== checkUserId) {
    return this.throw(400, 'The user id in the query does not match the session\'s user!');
  }

  this.status = 200;
}

router.get('/notifications', requireAuth, getNotificationAccess);

export default router.routes();
