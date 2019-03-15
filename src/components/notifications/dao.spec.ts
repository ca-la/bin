import * as Knex from 'knex';
import * as tape from 'tape';
import * as uuid from 'node-uuid';
import { test } from '../../test-helpers/fresh';
import * as NotificationsDAO from './dao';
import * as CollaboratorsDAO from '../../components/collaborators/dao';
import * as DesignsDAO from '../../dao/product-designs';
import createUser = require('../../test-helpers/create-user');
import db = require('../../services/db');
import {
  Notification,
  NotificationType
} from './domain-object';
import {
  generateInviteNotification,
  generatePartnerAcceptBidNotification
} from '../../test-helpers/factories/notification';
import generateCollection from '../../test-helpers/factories/collection';
import { InviteCollaboratorNotification } from './models/invite-collaborator';
import { PartnerAcceptServiceBidNotification } from './models/partner-accept-service-bid';
import { templateNotification } from './models/base';

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
  const data: InviteCollaboratorNotification = {
    ...templateNotification,
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
  await generatePartnerAcceptBidNotification({
    actorUserId: userOne.user.id
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
    [n2],
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
  const { user } = await createUser({ withSession: false });

  const {
    design: designOne,
    notification: notificationOne
  } = await generatePartnerAcceptBidNotification({
    actorUserId: user.id
  });
  const {
    design: designTwo,
    notification: notificationTwo
  } = await generatePartnerAcceptBidNotification({
    actorUserId: user.id,
    designId: designOne.id
  });
  await generatePartnerAcceptBidNotification({
    actorUserId: user.id,
    designId: designOne.id,
    sentEmailAt: new Date()
  });
  await generatePartnerAcceptBidNotification({
    actorUserId: user.id,
    designId: designTwo.id,
    sentEmailAt: new Date()
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    const results: any = await NotificationsDAO.findOutstanding(trx);

    t.deepEqual(
      results,
      [notificationTwo , notificationOne],
      'Returns unsent notifications with recipients'
    );
  });
});

test('Notifications DAO supports marking notifications as sent', async (t: tape.Test) => {
  const { user } = await createUser();

  const { notification: notificationOne } = await generatePartnerAcceptBidNotification({
    actorUserId: user.id
  });
  const { notification: notificationTwo } = await generatePartnerAcceptBidNotification({
    actorUserId: user.id
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    const notifications = await NotificationsDAO.markSent(
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
    ...templateNotification,
    actorUserId: userTwo.user.id,
    collectionId: collection.id,
    id: uuid.v4(),
    recipientUserId: admin.id,
    type: NotificationType.COLLECTION_SUBMIT
  });
  await generatePartnerAcceptBidNotification({
    actorUserId: userOne.user.id,
    designId: design.id,
    recipientUserId: admin.id
  });
  await generatePartnerAcceptBidNotification({
    actorUserId: userOne.user.id,
    designId: design.id,
    recipientUserId: admin.id
  });
  const unsentNotification: PartnerAcceptServiceBidNotification = {
    ...templateNotification,
    actorUserId: userOne.user.id,
    createdAt: new Date(),
    designId: design.id,
    id: uuid.v4(),
    recipientUserId: admin.id,
    sentEmailAt: null,
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID
  };

  const deletedCount = await NotificationsDAO.deleteRecent(unsentNotification);

  t.deepEqual(deletedCount, 2, 'Successfully deletes similar notifications');
});
