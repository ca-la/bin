import * as tape from 'tape';

import { test } from '../../test-helpers/fresh';
import * as API from '../../test-helpers/http';
import createUser = require('../../test-helpers/create-user');

import * as CollaboratorsDAO from '../../components/collaborators/dao';
import * as DesignsDAO from '../../dao/product-designs';
import { NotificationMessage } from './domain-object';
import {
  generateInviteNotification,
  generatePartnerAcceptBidNotification
} from '../../test-helpers/factories/notification';
import generateCollection from '../../test-helpers/factories/collection';

const API_PATH = '/notifications';

test(`GET ${API_PATH} returns a list of notificationMessages for the user`,
async (t: tape.Test) => {
  const userOne = await createUser();
  const userTwo = await createUser();

  const d1 = await DesignsDAO.create({
    productType: 'HOODIE',
    title: 'Raf Simons x Sterling Ruby Hoodie',
    userId: userOne.user.id
  });
  const collection1 = await generateCollection({ createdBy: userOne.user.id });
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
  const { notification: n1 } = await generatePartnerAcceptBidNotification({
    actorUserId: userOne.user.id,
    recipientUserId: userTwo.user.id
  });
  const { notification: n2 } = await generateInviteNotification({
    actorUserId: userOne.user.id,
    collaboratorId: c1.id,
    collectionId: collection1.collection.id,
    recipientUserId: null
  });
  await generateInviteNotification({
    actorUserId: userOne.user.id,
    collaboratorId: c2.id,
    collectionId: collection1.collection.id,
    recipientUserId: null
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
  t.deepEqual(body2, [], 'Returns the list of notifications for the user session');

  const [response3] = await API.get(`${API_PATH}?limit=-1&offset=7`, {
    headers: API.authHeader(userTwo.session.id)
  });
  t.equal(response3.status, 400);
});