import tape from 'tape';

import { sandbox, test } from '../../test-helpers/fresh';
import API from '../../test-helpers/http';
import createUser = require('../../test-helpers/create-user');

import DesignsDAO from '../product-designs/dao';
import SessionsDAO from '../../dao/sessions';
import generateNotification, {
  generateNotifications
} from '../../test-helpers/factories/notification';
import generateCollection from '../../test-helpers/factories/collection';
import { NotificationMessage } from '@cala/ts-lib';
import { NotificationType } from './domain-object';
import generateCollaborator from '../../test-helpers/factories/collaborator';
import * as NotificationAnnouncer from '../iris/messages/notification';

const API_PATH = '/notifications';

test(`GET ${API_PATH} returns a list of notificationMessages for the user`, async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const userOne = await createUser();
  const userTwo = await createUser();

  const d1 = await DesignsDAO.create({
    productType: 'HOODIE',
    title: 'Raf Simons x Sterling Ruby Hoodie',
    userId: userOne.user.id
  });
  const collection1 = await generateCollection({ createdBy: userOne.user.id });
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
  const { notification: n1 } = await generateNotification({
    actorUserId: userOne.user.id,
    recipientUserId: userTwo.user.id,
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID
  });
  const { notification: n2 } = await generateNotification({
    actorUserId: userOne.user.id,
    collaboratorId: c1.id,
    collectionId: collection1.collection.id,
    recipientUserId: null,
    type: NotificationType.INVITE_COLLABORATOR
  });
  await generateNotification({
    actorUserId: userOne.user.id,
    collaboratorId: c2.id,
    collectionId: collection1.collection.id,
    recipientUserId: null,
    type: NotificationType.INVITE_COLLABORATOR
  });

  const [response1, body1] = await API.get(API_PATH, {
    headers: API.authHeader(userTwo.session.id)
  });
  t.equal(response1.status, 200);
  t.deepEqual(
    body1.map((notification: NotificationMessage): string => notification.id),
    [n2.id, n1.id],
    'Returns the list of notifications for the user session'
  );

  const [response2, body2] = await API.get(`${API_PATH}`, {
    headers: API.authHeader(userOne.session.id)
  });
  t.equal(response2.status, 200);
  t.deepEqual(
    body2,
    [],
    'Returns the list of notifications for the user session'
  );

  const [response3] = await API.get(`${API_PATH}?limit=-1&offset=7`, {
    headers: API.authHeader(userTwo.session.id)
  });
  t.equal(response3.status, 400);

  const [response4, body4] = await API.get(`${API_PATH}?limit=1&offset=1`, {
    headers: API.authHeader(userTwo.session.id)
  });
  t.equal(response4.status, 200);
  t.deepEqual(
    body4.map((notification: NotificationMessage): string => notification.id),
    [n1.id],
    'Returns the limit + offset list of notifications for the user session'
  );
});

test(`GET ${API_PATH}/unread returns the number of unread notifications`, async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const userOne = await createUser();
  const userTwo = await createUser();

  const d1 = await DesignsDAO.create({
    productType: 'HOODIE',
    title: 'Raf Simons x Sterling Ruby Hoodie',
    userId: userOne.user.id
  });
  const collection1 = await generateCollection({ createdBy: userOne.user.id });
  const { collaborator: c1 } = await generateCollaborator({
    collectionId: null,
    designId: d1.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: userTwo.user.id
  });
  await generateNotification({
    actorUserId: userOne.user.id,
    recipientUserId: userTwo.user.id,
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID
  });
  await generateNotification({
    actorUserId: userOne.user.id,
    collaboratorId: c1.id,
    collectionId: collection1.collection.id,
    recipientUserId: null,
    type: NotificationType.INVITE_COLLABORATOR
  });

  const [response, body] = await API.get(`${API_PATH}/unread`, {
    headers: API.authHeader(userTwo.session.id)
  });
  t.equal(response.status, 200);
  t.deepEqual(
    body.unreadNotificationsCount,
    2,
    'Returns the number of unread notifications for the user'
  );
});

test(`PUT ${API_PATH}/last-read marks notifications as read`, async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const setup = await generateNotifications();

  const designerSession = await SessionsDAO.createForUser(
    setup.users.designer,
    { role: setup.users.designer.role }
  );

  const [, notifications] = await API.get(API_PATH, {
    headers: API.authHeader(designerSession.id)
  });
  const [, before] = await API.get(`${API_PATH}/unread`, {
    headers: API.authHeader(designerSession.id)
  });
  t.deepEqual(
    before.unreadNotificationsCount,
    6,
    'number of notifications before marking read'
  );

  const [mark] = await API.put(`${API_PATH}/last-read`, {
    headers: API.authHeader(designerSession.id),
    body: {
      id: notifications[2].id
    }
  });
  t.equal(mark.status, 204);

  const [, after] = await API.get(`${API_PATH}/unread`, {
    headers: API.authHeader(designerSession.id)
  });
  t.deepEqual(
    after.unreadNotificationsCount,
    2,
    'number of notifications after marking read'
  );

  const [markOlder] = await API.put(`${API_PATH}/last-read`, {
    headers: API.authHeader(designerSession.id),
    body: {
      id: notifications[5].id
    }
  });
  t.equal(markOlder.status, 204, 'marking older notifications still succeeds');

  const [, afterOlder] = await API.get(`${API_PATH}/unread`, {
    headers: API.authHeader(designerSession.id)
  });
  t.deepEqual(
    afterOlder.unreadNotificationsCount,
    2,
    'marking older notifications does not change server state'
  );
});

test(`PATCH ${API_PATH}/read marks notifications as read`, async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const userOne = await createUser();
  const userTwo = await createUser();

  const d1 = await DesignsDAO.create({
    productType: 'HOODIE',
    title: 'Raf Simons x Sterling Ruby Hoodie',
    userId: userOne.user.id
  });
  const collection1 = await generateCollection({ createdBy: userOne.user.id });
  const { collaborator: c1 } = await generateCollaborator({
    collectionId: null,
    designId: d1.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: userTwo.user.id
  });
  const { notification: n1 } = await generateNotification({
    actorUserId: userOne.user.id,
    recipientUserId: userTwo.user.id,
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID
  });
  const { notification: n2 } = await generateNotification({
    actorUserId: userOne.user.id,
    collaboratorId: c1.id,
    collectionId: collection1.collection.id,
    recipientUserId: null,
    type: NotificationType.INVITE_COLLABORATOR
  });

  const [response1, body1] = await API.get(API_PATH, {
    headers: API.authHeader(userTwo.session.id)
  });
  t.equal(response1.status, 200);
  t.deepEqual(
    body1.map((notification: NotificationMessage): string => notification.id),
    [n2.id, n1.id],
    'Returns the list of notifications for the user session'
  );

  const [response2, body2] = await API.patch(
    `${API_PATH}/read?notificationIds=${n1.id},${n2.id}`,
    {
      headers: API.authHeader(userTwo.session.id)
    }
  );
  t.equal(response2.status, 200);
  t.deepEqual(body2.ok, true, 'successfully marks notifications as read');

  const [response3, body3] = await API.get(API_PATH, {
    headers: API.authHeader(userTwo.session.id)
  });
  t.equal(response3.status, 200);
  t.deepEqual(
    body3.every(
      (notification: NotificationMessage): boolean =>
        notification.readAt !== null
    ),
    true,
    'readAt is set correctly'
  );
});

test(`PATCH ${API_PATH}/read returns 403 for wrong user`, async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const userOne = await createUser();
  const userTwo = await createUser();

  const d1 = await DesignsDAO.create({
    productType: 'HOODIE',
    title: 'Raf Simons x Sterling Ruby Hoodie',
    userId: userOne.user.id
  });
  const collection1 = await generateCollection({ createdBy: userOne.user.id });
  const { collaborator: c1 } = await generateCollaborator({
    collectionId: null,
    designId: d1.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: userTwo.user.id
  });
  const { notification: n1 } = await generateNotification({
    actorUserId: userTwo.user.id,
    recipientUserId: userOne.user.id,
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID
  });
  const { notification: n2 } = await generateNotification({
    actorUserId: userOne.user.id,
    collaboratorId: c1.id,
    collectionId: collection1.collection.id,
    recipientUserId: null,
    type: NotificationType.INVITE_COLLABORATOR
  });

  const [response2] = await API.patch(
    `${API_PATH}/read?notificationIds=${n1.id},${n2.id}`,
    {
      headers: API.authHeader(userTwo.session.id)
    }
  );
  t.equal(response2.status, 403, 'Access is denied');
});
