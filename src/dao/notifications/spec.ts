import * as Knex from 'knex';
import * as tape from 'tape';
import * as uuid from 'node-uuid';
import { test } from '../../test-helpers/fresh';
import * as NotificationsDAO from './index';
import * as CollaboratorsDAO from '../collaborators';
import * as DesignsDAO from '../product-designs';
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
  const inserted = await NotificationsDAO.create(data);

  const result = await NotificationsDAO.findById(inserted.id);
  t.deepEqual(result, inserted, 'Returned the inserted notification');
});

test('Notifications DAO supports finding by user id', async (t: tape.Test) => {
  const userOne = await createUser({ withSession: false });
  const userTwo = await createUser({ withSession: false });

  const d1 = await DesignsDAO.create({
    productType: 'HOODIE',
    title: 'Raf Simons x Sterling Ruby Hoodie',
    userId: userOne.user.id
  });
  const c1 = await CollaboratorsDAO.create({
    collectionId: null,
    designId: d1.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: userTwo.user.id
  });
  const c2 = await CollaboratorsDAO.create({
    collectionId: null,
    designId: d1.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: 'raf@rafsimons.com',
    userId: null
  });
  const n1 = await NotificationsDAO.create({
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
  const n2 = await NotificationsDAO.create({
    actionDescription: null,
    actorUserId: userOne.user.id,
    collaboratorId: c1.id,
    collectionId: null,
    commentId: null,
    designId: null,
    id: uuid.v4(),
    recipientUserId: null,
    sectionId: null,
    sentEmailAt: null,
    stageId: null,
    taskId: null,
    type: null
  });
  await NotificationsDAO.create({
    actionDescription: null,
    actorUserId: userOne.user.id,
    collaboratorId: c2.id,
    collectionId: null,
    commentId: null,
    designId: null,
    id: uuid.v4(),
    recipientUserId: null,
    sectionId: null,
    sentEmailAt: null,
    stageId: null,
    taskId: null,
    type: null
  });

  t.deepEqual(
    await NotificationsDAO.findByUserId(userTwo.user.id, { offset: 0, limit: 10 }),
    [n2, n1],
    'Returns only the notifications associated with the user (collaborator + user)'
  );
  t.deepEqual(
    await NotificationsDAO.findByUserId(userTwo.user.id, { offset: 2, limit: 4 }),
    [],
    'Returns notifications based off the limit and offset'
  );
  t.deepEqual(
    await NotificationsDAO.findByUserId(userTwo.user.id, { offset: 6, limit: 3 }),
    [],
    'Returns notifications based off the limit and offset (even if they are whack)'
  );
  t.deepEqual(
    await NotificationsDAO.findByUserId(userOne.user.id, { offset: 0, limit: 10 }),
    [],
    'Returns only the notifications associated with the user (collaborator + user)'
  );
});

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
  await NotificationsDAO.create({
    actionDescription: null,
    actorUserId: userOne.user.id,
    collaboratorId: null,
    collectionId: null,
    commentId: null,
    designId: null,
    id: uuid.v4(),
    recipientUserId: null,
    sectionId: null,
    sentEmailAt: null,
    stageId: null,
    taskId: null,
    type: NotificationType.TASK_COMMENT_CREATE
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    t.deepEqual(
      await NotificationsDAO.findOutstandingTrx(trx),
      [notificationTwo, notificationOne],
      'Returns unsent notifications with recipients'
    );
  });
});

test('Notifications DAO supports marking notifications as sent', async (t: tape.Test) => {
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
    type: NotificationType.TASK_COMMENT_CREATE
  });
  const notificationTwo = await NotificationsDAO.create({
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
    const notifications = await NotificationsDAO.markSentTrx(
      [notificationOne.id, notificationTwo.id],
      trx
    );
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

  await NotificationsDAO.create({
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
  await NotificationsDAO.create({
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
  await NotificationsDAO.create({
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

  const deletedCount = await NotificationsDAO.deleteRecent(unsentNotification);

  t.deepEqual(deletedCount, 2, 'Successfully deletes similar notifications');
});
