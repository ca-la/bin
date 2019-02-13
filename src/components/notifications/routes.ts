import * as Router from 'koa-router';
import * as Koa from 'koa';

import { Notification } from './domain-object';
import * as NotificationsDAO from './dao';
import requireAuth = require('../../middleware/require-auth');
import { createNotificationMessage } from './notification-messages';

const router = new Router();

interface GetListQuery {
  limit?: number;
  offset?: number;
}

function* getList(this: Koa.Application.Context): AsyncIterableIterator<Notification[]> {
  const { userId } = this.state;
  const { limit, offset }: GetListQuery = this.query;

  if ((limit && limit < 0) || (offset && offset < 0)) {
    return this.throw(400, 'Offset / Limit cannot be negative!');
  }

  const notifications = yield NotificationsDAO.findByUserId(
    userId,
    { limit: limit || 20, offset: offset || 0 }
  );
  this.status = 200;
  this.body = yield Promise.all(notifications.map(createNotificationMessage));
}

router.get('/', requireAuth, getList);

export default router.routes();
