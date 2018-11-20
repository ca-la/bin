import * as tape from 'tape';
import * as uuid from 'node-uuid';
import * as sinon from 'sinon';

import { sandbox, test } from '../../test-helpers/fresh';
import * as NotificationsDAO from '../../dao/notifications';
import createUser = require('../../test-helpers/create-user');
import { NotificationType } from '../../domain-objects/notification';
import { sendNotificationEmails } from './index';
import * as EmailService from '../email';

test('Notifications DAO supports finding outstanding notifications', async (t: tape.Test) => {
  const userOne = await createUser();
  const userTwo = await createUser();

  const notificationOne = await NotificationsDAO.create({
    actionDescription: null,
    actorUserId: userOne.user.id,
    collaboratorId: null,
    collectionId: null,
    commentId: null,
    designId: null,
    id: uuid.v4(),
    recipientUserId: userTwo.user.id,
    sectionId: null,
    sentEmailAt: null,
    stageId: null,
    taskId: null,
    type: null
  });
  const notificationTwo = await NotificationsDAO.create({
    actionDescription: null,
    actorUserId: userTwo.user.id,
    collaboratorId: null,
    collectionId: null,
    commentId: null,
    designId: null,
    id: uuid.v4(),
    recipientUserId: userOne.user.id,
    sectionId: null,
    sentEmailAt: null,
    stageId: null,
    taskId: null,
    type: null
  });
  await NotificationsDAO.create({
    actionDescription: null,
    actorUserId: userOne.user.id,
    collaboratorId: null,
    collectionId: null,
    commentId: null,
    designId: null,
    id: uuid.v4(),
    recipientUserId: userTwo.user.id,
    sectionId: null,
    sentEmailAt: new Date(),
    stageId: null,
    taskId: null,
    type: NotificationType.TASK_COMMENT_CREATE
  });

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
