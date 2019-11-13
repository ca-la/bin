import * as Router from 'koa-router';
import * as Koa from 'koa';

import { findOutstanding } from '../notifications/dao';
import requireAdmin = require('../../middleware/require-admin');

const router = new Router();

interface NotificationsHealthMetrics {
  oldestCreatedAt: Date | null;
  outstandingNotifications: number;
}

function* getNotificationsHealth(
  this: Koa.Application.Context
): Iterator<any, any, any> {
  const outstandingNotifications = yield findOutstanding();
  const oldestNotification =
    outstandingNotifications[outstandingNotifications.length - 1];
  const health: NotificationsHealthMetrics = {
    outstandingNotifications: outstandingNotifications.length,
    oldestCreatedAt: oldestNotification ? oldestNotification.createdAt : null
  };

  this.body = health;
  this.status = 200;
}

router.get('/notifications', requireAdmin, getNotificationsHealth);

export default router.routes();
