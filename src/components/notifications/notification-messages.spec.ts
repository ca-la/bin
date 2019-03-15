import * as tape from 'tape';

import { test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');

import * as CollaboratorsDAO from '../../components/collaborators/dao';
import * as NotificationsDAO from '../../components/notifications/dao';
import * as DesignsDAO from '../../dao/product-designs';
import {
  generateInviteNotification,
  generatePartnerAcceptBidNotification
} from '../../test-helpers/factories/notification';
import generateCollection from '../../test-helpers/factories/collection';
import { createNotificationMessage } from './notification-messages';
import { STUDIO_HOST } from '../../config';
import { NotificationMessage } from '@cala/ts-lib';

test('notification messages returns notifacation messages to the user',
  async (t: tape.Test) => {
    const userOne = await createUser();
    const userTwo = await createUser();

    const d1 = await DesignsDAO.create({
      productType: 'HOODIE',
      title: 'Raf Simons x Sterling Ruby Hoodie',
      userId: userOne.user.id
    });
    const collection1 = await generateCollection({ title: 'test', createdBy: userOne.user.id });
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
      designId: null,
      recipientUserId: null
    });
    await generateInviteNotification({
      actorUserId: userOne.user.id,
      collaboratorId: c2.id,
      collectionId: collection1.collection.id,
      recipientUserId: null
    });

    const notifications = await NotificationsDAO
      .findByUserId(userTwo.user.id, { limit: 20, offset: 0 });
    const messages = await Promise.all(notifications
      .map(createNotificationMessage));

    t.deepEqual(
      messages
        .filter((notification: NotificationMessage | null): notification is NotificationMessage =>
          notification !== null)
        .map((notification: NotificationMessage): string => notification.id),
      [n2.id, n1.id],
      'Returns the list of notifications for the user session'
    );
    t.assert(messages
        .filter((notification: NotificationMessage | null): notification is NotificationMessage =>
          notification !== null && notification.id !== n1.id)
        .every((message: NotificationMessage) =>
          collection1.collection.title !== null
          && message.html.includes(collection1.collection.title)),
      'message html contains the collection title');
    t.assert(messages
        .filter((notification: NotificationMessage | null): notification is NotificationMessage =>
          notification !== null)
        .every((message: NotificationMessage) =>
          message.actor !== null && message.actor.id === userOne.user.id),
      'message actor is the user');
    t.assert(messages
        .filter((notification: NotificationMessage | null): notification is NotificationMessage =>
          notification !== null && notification.id !== n1.id)
        .every((message: NotificationMessage) => {
          return message.actor !== null &&
          message.html
            .indexOf(`<a href="${STUDIO_HOST}/collections/${collection1.collection.id}">`) !== -1;
        }),
      'message link goes to correct collection');
  });
