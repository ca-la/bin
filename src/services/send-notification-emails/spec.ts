import * as tape from 'tape';
import * as sinon from 'sinon';

import { sandbox, test } from '../../test-helpers/fresh';
import * as NotificationsDAO from '../../components/notifications/dao';
import createUser = require('../../test-helpers/create-user');
import * as EmailService from '../email';
import { sendNotificationEmails } from './index';
import {
  generateDesignUpdateNotification,
  generateInviteNotification
} from '../../test-helpers/factories/notification';

test('sendNotificationEmails supports finding outstanding notifications', async (t: tape.Test) => {
  const userOne = await createUser();
  const userTwo = await createUser();

  const { notification: notificationOne } = await generateDesignUpdateNotification({
    actorUserId: userOne.user.id,
    recipientUserId: userTwo.user.id
  });
  const { notification: notificationTwo } = await generateDesignUpdateNotification({
    actorUserId: userTwo.user.id,
    recipientUserId: userOne.user.id
  });
  await generateInviteNotification();

  const emailStub = sandbox().stub(EmailService, 'enqueueSend').returns(Promise.resolve());

  await sendNotificationEmails();

  sinon.assert.callCount(emailStub, 2);
  t.ok(true, 'Successfully invoked email service on notifications');

  const nOne = await NotificationsDAO.findById(notificationOne.id);
  const nTwo = await NotificationsDAO.findById(notificationTwo.id);
  if (nOne && nTwo) {
    t.notDeepEqual(nOne.sentEmailAt, null, 'Notification was marked as sent.');
    t.notDeepEqual(nTwo.sentEmailAt, null, 'Notification was marked as sent.');
  } else {
    t.fail('Notifications improperly deleted.');
  }
});
