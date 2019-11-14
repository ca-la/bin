import tape from 'tape';
import sinon from 'sinon';
import uuid from 'node-uuid';

import { sandbox, test } from '../../test-helpers/fresh';
import * as NotificationsDAO from '../../components/notifications/dao';
import createUser from '../../test-helpers/create-user';
import EmailService from '../email';
import { sendNotificationEmails } from './index';
import generateNotification from '../../test-helpers/factories/notification';
import { NotificationType } from '../../components/notifications/domain-object';
import * as NotificationAnnouncer from '../../components/iris/messages/notification';
import * as MessageService from '../../components/notifications/notification-messages';

test('sendNotificationEmails supports finding outstanding notifications', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const userOne = await createUser();
  const userTwo = await createUser();

  const { notification: notificationOne } = await generateNotification({
    actorUserId: userOne.user.id,
    createdAt: new Date(new Date().getMilliseconds() - 46 * 60 * 1000),
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID
  });
  const { notification: notificationTwo } = await generateNotification({
    actorUserId: userTwo.user.id,
    createdAt: new Date(new Date().getMilliseconds() - 46 * 60 * 1000),
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID
  });
  await generateNotification({ type: NotificationType.INVITE_COLLABORATOR });

  const emailStub = sandbox()
    .stub(EmailService, 'enqueueSend')
    .returns(Promise.resolve());

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

test('sendNotificationEmails will delete an unsendable notification', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const emailStub = sandbox()
    .stub(EmailService, 'enqueueSend')
    .returns(Promise.resolve());
  const createMessageStub = sandbox()
    .stub(MessageService, 'createNotificationMessage')
    .resolves(null);
  const { user: userOne } = await createUser({ withSession: false });

  const { notification: nOne } = await generateNotification({
    actorUserId: userOne.id,
    createdAt: new Date(new Date().getMilliseconds() - 46 * 60 * 1000),
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID
  });

  await sendNotificationEmails();

  t.equal(emailStub.callCount, 0, 'The email service is never triggered');
  t.equal(
    createMessageStub.callCount,
    1,
    'Message notification was called once.'
  );
  t.deepEqual(createMessageStub.args[0][0], nOne);

  const unfoundNotification = await NotificationsDAO.findById(nOne.id);
  t.equal(unfoundNotification, null, 'The notification was marked as deleted');
});

test('sendNotificationEmails gracefully handles failures', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const userOne = await createUser();
  const userTwo = await createUser();

  const idOne = uuid.v4();
  const idTwo = uuid.v4();
  const idThree = uuid.v4();

  const { notification: notificationOne } = await generateNotification({
    actorUserId: userOne.user.id,
    createdAt: new Date(new Date().getMilliseconds() - 48 * 60 * 1000),
    id: idOne,
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID
  });
  const { notification: notificationTwo } = await generateNotification({
    actorUserId: userTwo.user.id,
    createdAt: new Date(new Date().getMilliseconds() - 47 * 60 * 1000),
    id: idTwo,
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID
  });
  const { notification: notificationThree } = await generateNotification({
    actorUserId: userTwo.user.id,
    createdAt: new Date(new Date().getMilliseconds() - 46 * 60 * 1000),
    id: idThree,
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID
  });

  const emailStub = sandbox()
    .stub(EmailService, 'enqueueSend')
    .callsFake(
      async (queueObject: any): Promise<void> => {
        if (queueObject.params.notifications[0].id === idTwo) {
          throw new Error('Not going to send!');
        }
      }
    );

  try {
    await sendNotificationEmails();
    t.fail('Should not actually go through');
  } catch (e) {
    t.equal(
      e.message,
      `Failed to send to SQS the following notifications: ${idTwo}`
    );
  }

  t.equal(emailStub.callCount, 2, 'Email service is called twice');

  const nOne = await NotificationsDAO.findById(notificationOne.id);
  const nTwo = await NotificationsDAO.findById(notificationTwo.id);
  const nThree = await NotificationsDAO.findById(notificationThree.id);
  if (!nOne || !nTwo || !nThree) {
    throw new Error('Notifications were not found in the test database!');
  }

  t.equal(nOne.sentEmailAt, null, 'Notification was not marked as sent.');
  t.equal(nTwo.sentEmailAt, null, 'Notification was not marked as sent.');
  t.notEqual(nThree.sentEmailAt, null, 'Notification was marked as sent.');
});
