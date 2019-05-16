import * as Router from 'koa-router';
import * as Koa from 'koa';

import * as NotificationsDAO from './dao';
import requireAuth = require('../../middleware/require-auth');
import { createNotificationMessage } from './notification-messages';
import { NotificationMessage } from '@cala/ts-lib';
import { Notification } from './domain-object';

const router = new Router();

interface GetListQuery {
  limit?: number;
  offset?: number;
}

function* getList(this: Koa.Application.Context): AsyncIterableIterator<NotificationMessage[]> {
  const { userId } = this.state;
  const { limit, offset }: GetListQuery = this.query;

  if ((limit && limit < 0) || (offset && offset < 0)) {
    return this.throw(400, 'Offset / Limit cannot be negative!');
  }

  const notifications = yield NotificationsDAO.findByUserId(
    userId,
    { limit: limit || 20, offset: offset || 0 }
  );
  const messages: (NotificationMessage | null)[] = yield Promise.all(
    notifications.map(createNotificationMessage));

  this.status = 200;
  this.body = messages.filter((message: NotificationMessage | null) => message !== null);
}

function* getUnreadCount(this: Koa.Application.Context): AsyncIterableIterator<number[]> {
  const { userId } = this.state;

  const unreadNotificationsCount = yield NotificationsDAO.findUnreadCountByUserId(userId);

  this.status = 200;
  this.body = { unreadNotificationsCount };
}

function* setRead(this: Koa.Application.Context): AsyncIterableIterator<void> {
  const { notificationIds } = this.query;
  if (notificationIds) {
    const idList = notificationIds.split(',');
    for (const id of idList) {
      const notification: Notification = yield NotificationsDAO.findById(id);
      if (!notification ||
        (notification.recipientUserId !== null
          && notification.recipientUserId !== this.state.userId)) {
        return this.throw(403, 'Access denied for this resource');
      }
    }
    yield NotificationsDAO.markRead(idList);
    this.status = 200;
    this.body = { ok: true };
  } else {
    this.throw('Missing notification ids');
  }
}

router.get('/', requireAuth, getList);
router.get('/unread', requireAuth, getUnreadCount);
router.patch('/read', requireAuth, setRead);

export default router.routes();
