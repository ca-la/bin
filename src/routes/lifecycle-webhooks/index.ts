import * as Router from 'koa-router';
import * as Koa from 'koa';
import { sendNotificationEmails } from '../../services/send-notification-emails';

const router = new Router();

/**
 * POST /lifecycle-webhooks/purge-notifications
 *
 * Called on a regular interval by a scheduled Lambda function. When called,
 * this is our opportunity to find recent notifications, batch them up, and
 * email them to the appropriate recipients.
 */
function* postPurgeNotifications(this: Koa.Application.Context): AsyncIterableIterator<any> {
  yield sendNotificationEmails();
  this.status = 200;
  this.body = { success: true };
}

router.post('/purge-notifications', postPurgeNotifications);

export = router.routes();
