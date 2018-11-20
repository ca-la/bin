import * as Knex from 'knex';
import * as tape from 'tape';
import * as uuid from 'node-uuid';
import { test } from '../../test-helpers/fresh';
import { create, deleteRecent, findById, findOutstandingTrx, markSentTrx } from './index';
import createUser = require('../../test-helpers/create-user');
import db = require('../../services/db');
import Notification, { NotificationType } from '../../domain-objects/notification';
import { create as createDesign } from '../../dao/product-designs';

test('Notifications DAO supports creation', async (t: tape.Test) => {
  const userOne = await createUser();
  const userTwo = await createUser();

  const data = {
    actionDescription: null,
    actorUserId: userOne.user.id,
    collaboratorId: null,
    collectionId: null,
    commentId: null,
    createdAt: new Date(),
    designId: null,
    id: uuid.v4(),
    recipientUserId: userTwo.user.id,
    sectionId: null,
    sentEmailAt: null,
    stageId: null,
    taskId: null,
    type: null
  };
  const inserted = await create(data);

  const result = await findById(inserted.id);
  t.deepEqual(result, inserted, 'Returned the inserted notification');
});

test('Notifications DAO supports finding outstanding notifications', async (t: tape.Test) => {
  const userOne = await createUser();
  const userTwo = await createUser();

  const notificationOne = await create({
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
  const notificationTwo = await create({
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
  await create({
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

  await db.transaction(async (trx: Knex.Transaction) => {
    const notifications = await findOutstandingTrx(trx);
    t.deepEqual(notifications, [notificationTwo, notificationOne], 'Returns unsent notifications');
  });
});

test('Notifications DAO supports marking notifications as sent', async (t: tape.Test) => {
  const userOne = await createUser();
  const userTwo = await createUser();

  const notificationOne = await create({
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
    type: NotificationType.TASK_COMMENT_CREATE
  });
  const notificationTwo = await create({
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
    type: NotificationType.TASK_COMMENT_CREATE
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    const notifications = await markSentTrx([notificationOne.id, notificationTwo.id], trx);
    t.deepEqual(
      notifications.map((notification: Notification): string => notification.id),
      [notificationOne.id, notificationTwo.id],
      'Returns marked notifications'
    );
  });
});

test('Notifications DAO supports deleting similar notifications', async (t: tape.Test) => {
  const userOne = await createUser();
  const userTwo = await createUser();

  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Green Tee',
    userId: userTwo.user.id
  });

  await create({
    actionDescription: null,
    actorUserId: userTwo.user.id,
    collaboratorId: null,
    collectionId: null,
    commentId: null,
    designId: design.id,
    id: uuid.v4(),
    recipientUserId: userOne.user.id,
    sectionId: null,
    sentEmailAt: null,
    stageId: null,
    taskId: null,
    type: NotificationType.TASK_COMMENT_CREATE
  });
  await create({
    actionDescription: null,
    actorUserId: userOne.user.id,
    collaboratorId: null,
    collectionId: null,
    commentId: null,
    designId: design.id,
    id: uuid.v4(),
    recipientUserId: userTwo.user.id,
    sectionId: null,
    sentEmailAt: null,
    stageId: null,
    taskId: null,
    type: NotificationType.SECTION_UPDATE
  });
  await create({
    actionDescription: null,
    actorUserId: userOne.user.id,
    collaboratorId: null,
    collectionId: null,
    commentId: null,
    designId: design.id,
    id: uuid.v4(),
    recipientUserId: userTwo.user.id,
    sectionId: null,
    sentEmailAt: null,
    stageId: null,
    taskId: null,
    type: NotificationType.SECTION_UPDATE
  });
  const unsentNotification = {
    actionDescription: null,
    actorUserId: userOne.user.id,
    collaboratorId: null,
    collectionId: null,
    commentId: null,
    designId: design.id,
    id: uuid.v4(),
    recipientUserId: userTwo.user.id,
    sectionId: null,
    sentEmailAt: null,
    stageId: null,
    taskId: null,
    type: NotificationType.SECTION_UPDATE
  };

  const deletedCount = await deleteRecent(unsentNotification);

  t.deepEqual(deletedCount, 2, 'Successfully deletes similar notifications');
});
