import * as Knex from 'knex';
import * as tape from 'tape';
import * as uuid from 'node-uuid';
import { test } from '../../test-helpers/fresh';
import * as NotificationsDAO from './dao';
import * as CollaboratorsDAO from '../../dao/collaborators';
import * as DesignsDAO from '../../dao/product-designs';
import createUser = require('../../test-helpers/create-user');
import db = require('../../services/db');
import {
  DesignUpdateNotification,
  ImmediateInviteNotification,
  Notification,
  NotificationType
} from './domain-object';
import {
  generateDesignUpdateNotification,
  generateInviteNotification
} from '../../test-helpers/factories/notification';
import generateCollection from '../../test-helpers/factories/collection';

test('Notifications DAO supports creation', async (t: tape.Test) => {
  const { user: userOne } = await createUser({ withSession: false });
  const { user: userTwo } = await createUser({ withSession: false });
  const { collection } = await generateCollection({ createdBy: userOne.id });
  const c1 = await CollaboratorsDAO.create({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: userTwo.id
  });
  const data: ImmediateInviteNotification = {
    actorUserId: userOne.id,
    collaboratorId: c1.id,
    collectionId: collection.id,
    createdAt: new Date(),
    designId: null,
    id: uuid.v4(),
    recipientUserId: userTwo.id,
    sentEmailAt: new Date(),
    type: NotificationType.INVITE_COLLABORATOR
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
  const { notification: n1 } = await generateDesignUpdateNotification({
    actorUserId: userOne.user.id,
    recipientUserId: userTwo.user.id
  });
  const { notification: n2 } = await generateInviteNotification({
    actorUserId: userOne.user.id,
    collaboratorId: c1.id
  });
  await generateInviteNotification({
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

  const {
    design: designOne,
    notification: notificationOne
  } = await generateDesignUpdateNotification({
    actorUserId: userOne.id,
    recipientUserId: userTwo.id
  });
  const {
    design: designTwo,
    notification: notificationTwo
  } = await generateDesignUpdateNotification({
    actorUserId: userOne.id,
    recipientUserId: userTwo.id
  });
  await generateDesignUpdateNotification({
    actorUserId: userOne.id,
    recipientUserId: userTwo.id,
    sentEmailAt: new Date()
  });
  await generateDesignUpdateNotification({
    actorUserId: userOne.id,
    sentEmailAt: new Date()
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    const results: any = await NotificationsDAO.findOutstandingTrx(trx);
    const formattedResults = [
      {
        ...results[0],
        actor: {
          ...results[0].actor,
          createdAt: new Date(results[0].actor.createdAt)
        },
        design: {
          ...results[0].design,
          collectionIds: [],
          collections: [],
          createdAt: new Date(results[0].design.createdAt),
          imageIds: [],
          imageLinks: [],
          previewImageUrls: []
        }
      },
      {
        ...results[1],
        actor: {
          ...results[1].actor,
          createdAt: new Date(results[1].actor.createdAt)
        },
        design: {
          ...results[1].design,
          collectionIds: [],
          collections: [],
          createdAt: new Date(results[1].design.createdAt),
          imageIds: [],
          imageLinks: [],
          previewImageUrls: []
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
        design: designTwo,
        stage: null,
        task: null
      }, {
        ...notificationOne,
        actor: userOne,
        annotation: null,
        canvas: null,
        collection: null,
        comment: null,
        design: designOne,
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

  const { notification: notificationOne } = await generateDesignUpdateNotification({
    actorUserId: userOne.user.id,
    recipientUserId: userTwo.user.id
  });
  const { notification: notificationTwo } = await generateDesignUpdateNotification({
    actorUserId: userOne.user.id,
    recipientUserId: userTwo.user.id
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
  const userOne = await createUser({ withSession: false });
  const userTwo = await createUser({ withSession: false });
  const { user: admin } = await createUser({ withSession: false, role: 'ADMIN' });

  const design = await DesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Green Tee',
    userId: userTwo.user.id
  });
  const { collection } = await generateCollection({ createdBy: userTwo.user.id });

  await NotificationsDAO.create({
    actorUserId: userTwo.user.id,
    collectionId: collection.id,
    id: uuid.v4(),
    recipientUserId: admin.id,
    sentEmailAt: null,
    type: NotificationType.COLLECTION_SUBMIT
  });
  await generateDesignUpdateNotification({
    actionDescription: 'doing thangs',
    actorUserId: userOne.user.id,
    designId: design.id,
    recipientUserId: userTwo.user.id
  });
  await generateDesignUpdateNotification({
    actionDescription: 'doing thangs',
    actorUserId: userOne.user.id,
    designId: design.id,
    recipientUserId: userTwo.user.id
  });
  const unsentNotification: DesignUpdateNotification = {
    actionDescription: 'doing thangs',
    actorUserId: userOne.user.id,
    createdAt: new Date(),
    designId: design.id,
    id: uuid.v4(),
    recipientUserId: userTwo.user.id,
    sentEmailAt: null,
    type: NotificationType.DESIGN_UPDATE
  };

  const deletedCount = await NotificationsDAO.deleteRecent(unsentNotification);

  t.deepEqual(deletedCount, 2, 'Successfully deletes similar notifications');
});
