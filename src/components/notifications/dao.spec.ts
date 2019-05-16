import * as Knex from 'knex';
import * as tape from 'tape';
import * as uuid from 'node-uuid';
import { sandbox, test } from '../../test-helpers/fresh';
import * as NotificationsDAO from './dao';
import * as DesignsDAO from '../../dao/product-designs';
import createUser = require('../../test-helpers/create-user');
import db = require('../../services/db');
import {
  Notification,
  NotificationType
} from './domain-object';
import generateNotification from '../../test-helpers/factories/notification';
import generateCollection from '../../test-helpers/factories/collection';
import { InviteCollaboratorNotification } from './models/invite-collaborator';
import { PartnerAcceptServiceBidNotification } from './models/partner-accept-service-bid';
import { templateNotification } from './models/base';
import generateCollaborator from '../../test-helpers/factories/collaborator';
import * as NotificationAnnouncer from '../iris/messages/notification';

test('Notifications DAO supports creation', async (t: tape.Test) => {
  sandbox().stub(NotificationAnnouncer, 'announceNotificationCreation').resolves({});

  const { user: userOne } = await createUser({ withSession: false });
  const { user: userTwo } = await createUser({ withSession: false });
  const { collection } = await generateCollection({ createdBy: userOne.id });
  const { collaborator: c1 } = await generateCollaborator({
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
  sandbox().stub(NotificationAnnouncer, 'announceNotificationCreation').resolves({});
  const userOne = await createUser({ withSession: false });
  const userTwo = await createUser({ withSession: false });

  const d1 = await DesignsDAO.create({
    productType: 'HOODIE',
    title: 'Raf Simons x Sterling Ruby Hoodie',
    userId: userOne.user.id
  });
  const { collaborator: c1 } = await generateCollaborator({
    collectionId: null,
    designId: d1.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: userTwo.user.id
  });
  const { collaborator: c2 } = await generateCollaborator({
    collectionId: null,
    designId: d1.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: 'raf@rafsimons.com',
    userId: null
  });
  await generateNotification({
    actorUserId: userOne.user.id,
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID
  });
  const { notification: n2 } = await generateNotification({
    actorUserId: userOne.user.id,
    collaboratorId: c1.id,
    type: NotificationType.INVITE_COLLABORATOR
  });
  await generateNotification({
    actorUserId: userOne.user.id,
    collaboratorId: c2.id,
    type: NotificationType.INVITE_COLLABORATOR
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
  sandbox().stub(NotificationAnnouncer, 'announceNotificationCreation').resolves({});
  const { user } = await createUser({ withSession: false });

  const {
    notification: notificationOne
  } = await generateNotification({
    actorUserId: user.id,
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID
  });
  const {
    design: designTwo,
    notification: notificationTwo
  } = await generateNotification({
    actorUserId: user.id,
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID
  });
  await generateNotification({
    actorUserId: user.id,
    sentEmailAt: new Date(),
    type: NotificationType.COLLECTION_SUBMIT
  });
  await generateNotification({
    actorUserId: user.id,
    designId: designTwo.id,
    sentEmailAt: new Date(),
    type: NotificationType.PARTNER_DESIGN_BID
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
  sandbox().stub(NotificationAnnouncer, 'announceNotificationCreation').resolves({});
  const { user } = await createUser();

  const { notification: notificationOne } = await generateNotification({
    actorUserId: user.id,
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID
  });
  const { notification: notificationTwo } = await generateNotification({
    actorUserId: user.id,
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    const notifications = await NotificationsDAO.markSent(
      [notificationOne.id, notificationTwo.id],
      trx
    );
    const notificationIds = notifications.map(
      (notification: Notification): string => notification.id
    );
    t.true(notificationIds.includes(notificationOne.id), 'Returns first marked notification');
    t.true(notificationIds.includes(notificationTwo.id), 'Returns second marked notification');
  });
});

test('Notifications DAO supports deleting similar notifications', async (t: tape.Test) => {
  sandbox().stub(NotificationAnnouncer, 'announceNotificationCreation').resolves({});
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
  await generateNotification({
    actorUserId: userOne.user.id,
    designId: design.id,
    recipientUserId: admin.id,
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID
  });
  await generateNotification({
    actorUserId: userOne.user.id,
    designId: design.id,
    recipientUserId: admin.id,
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID
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

test('Notifications DAO supports marking read', async (t: tape.Test) => {
  sandbox().stub(NotificationAnnouncer, 'announceNotificationCreation').resolves({});
  const { user: userOne } = await createUser({ withSession: false });
  const { user: userTwo } = await createUser({ withSession: false });
  const { collection } = await generateCollection({ createdBy: userOne.id });
  const { collaborator: c1 } = await generateCollaborator({
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
  await NotificationsDAO.markRead([inserted.id]);
  const read = await NotificationsDAO.findById(inserted.id);
  if (!read) { throw new Error('FindById failed!'); }
  t.notDeepEqual(read.readAt, null, 'readAt is no longer null');
});

test('Notifications DAO supports finding unread count', async (t: tape.Test) => {
  sandbox().stub(NotificationAnnouncer, 'announceNotificationCreation').resolves({});
  const { user: userOne } = await createUser({ withSession: false });
  const { user: userTwo } = await createUser({ withSession: false });
  const { collection } = await generateCollection({ createdBy: userOne.id });
  const { collaborator: c1 } = await generateCollaborator({
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

  await generateNotification({
    actorUserId: userOne.id,
    recipientUserId: userTwo.id,
    type: NotificationType.ANNOTATION_COMMENT_CREATE
  });

  await generateNotification({
    actorUserId: userOne.id,
    collaboratorId: c1.id,
    readAt: new Date(),
    recipientUserId: userTwo.id,
    type: NotificationType.TASK_ASSIGNMENT
  });

  await generateNotification({
    actorUserId: userOne.id,
    readAt: new Date(),
    recipientUserId: userTwo.id,
    type: NotificationType.ANNOTATION_COMMENT_CREATE
  });

  await NotificationsDAO.create(data);
  const unreadCount = await NotificationsDAO.findUnreadCountByUserId(userTwo.id);
  t.deepEqual(unreadCount, 2, 'there are two unread notification');
});
