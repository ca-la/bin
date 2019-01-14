import * as Knex from 'knex';
import * as tape from 'tape';
import * as uuid from 'node-uuid';
import { test } from '../../test-helpers/fresh';
import * as NotificationsDAO from './dao';
import * as CollaboratorsDAO from '../../dao/collaborators';
import * as DesignsDAO from '../../dao/product-designs';
import createUser = require('../../test-helpers/create-user');
import db = require('../../services/db');
import Notification, { NotificationType } from './domain-object';
import generateNotification from '../../test-helpers/factories/notification';
import generateAnnotation from '../../test-helpers/factories/product-design-canvas-annotation';

test('Notifications DAO supports creation', async (t: tape.Test) => {
  const userOne = await createUser();
  const userTwo = await createUser();

  const data = {
    actionDescription: null,
    actorUserId: userOne.user.id,
    annotationId: null,
    canvasId: null,
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
  const { notification: n1 } = await generateNotification({
    actorUserId: userOne.user.id,
    recipientUserId: userTwo.user.id
  });
  const { notification: n2 } = await generateNotification({
    actorUserId: userOne.user.id,
    collaboratorId: c1.id
  });
  await generateNotification({
    actorUserId: userOne.user.id,
    collaboratorId: c2.id
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
  const { user: userOne } = await createUser({ withSession: false });
  const { user: userTwo } = await createUser({ withSession: false });

  const { annotation } = await generateAnnotation({ createdBy: userTwo.id });

  const { notification: notificationOne } = await generateNotification({
    actorUserId: userOne.id,
    annotationId: annotation.id,
    recipientUserId: userTwo.id
  });
  const { notification: notificationTwo } = await generateNotification({
    actorUserId: userOne.id,
    recipientUserId: userTwo.id
  });
  await generateNotification({
    actorUserId: userOne.id,
    recipientUserId: userTwo.id,
    sentEmailAt: new Date(),
    type: NotificationType.TASK_COMMENT_CREATE
  });
  await generateNotification({
    actorUserId: userOne.id,
    sentEmailAt: new Date(),
    type: NotificationType.TASK_COMMENT_CREATE
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    const results: any = await NotificationsDAO.findOutstandingTrx(trx);
    const formattedResults = [
      {
        ...results[0],
        actor: {
          ...results[0].actor,
          createdAt: new Date(results[0].actor.createdAt)
        }
      },
      {
        ...results[1],
        actor: {
          ...results[1].actor,
          createdAt: new Date(results[1].actor.createdAt)
        },
        annotation: {
          ...results[1].annotation,
          createdAt: new Date(results[1].annotation.createdAt)
        }
      }
    ];

    t.deepEqual(
      formattedResults,
      [{
        ...notificationTwo,
        actor: userOne,
        annotation: null,
        canvas: null,
        collection: null,
        comment: null,
        design: null,
        stage: null,
        task: null
      }, {
        ...notificationOne,
        actor: userOne,
        annotation,
        canvas: null,
        collection: null,
        comment: null,
        design: null,
        stage: null,
        task: null
      }],
      'Returns unsent notifications with recipients'
    );
  });
});

test('Notifications DAO supports marking notifications as sent', async (t: tape.Test) => {
  const userOne = await createUser();
  const userTwo = await createUser();

  const { notification: notificationOne } = await generateNotification({
    actorUserId: userOne.user.id,
    recipientUserId: userTwo.user.id,
    type: NotificationType.TASK_COMMENT_CREATE
  });
  const { notification: notificationTwo } = await generateNotification({
    actorUserId: userOne.user.id,
    recipientUserId: userTwo.user.id,
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

  const design = await DesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Green Tee',
    userId: userTwo.user.id
  });

  await generateNotification({
    actorUserId: userTwo.user.id,
    designId: design.id,
    recipientUserId: userOne.user.id,
    type: NotificationType.TASK_COMMENT_CREATE
  });
  await generateNotification({
    actorUserId: userOne.user.id,
    designId: design.id,
    recipientUserId: userTwo.user.id,
    type: NotificationType.SECTION_UPDATE
  });
  await generateNotification({
    actorUserId: userOne.user.id,
    designId: design.id,
    id: uuid.v4(),
    recipientUserId: userTwo.user.id,
    type: NotificationType.SECTION_UPDATE
  });
  const unsentNotification = {
    actionDescription: null,
    actorUserId: userOne.user.id,
    annotationId: null,
    canvasId: null,
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
