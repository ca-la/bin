import tape from 'tape';

import { sandbox, test } from '../../../../test-helpers/fresh';
import createUser from '../../../../test-helpers/create-user';
import * as SendMessageService from '../../send-message';
import * as CreateNotificationService from '../../../notifications/notification-messages';
import { NotificationType } from '../../../notifications/domain-object';
import { announceNotificationCreation } from './index';
import { FullTaskAssignmentNotification } from '../../../notifications/models/task-assignment';
import { FullInviteCollaboratorNotification } from '../../../notifications/models/invite-collaborator';

test('sendMessage supports sending a message', async (t: tape.Test) => {
  const sendStub = sandbox()
    .stub(SendMessageService, 'sendMessage')
    .resolves({});
  const createStub = sandbox()
    .stub(CreateNotificationService, 'createNotificationMessage')
    .resolves({
      foo: 'bar'
    });
  const { user: actor } = await createUser({ withSession: false });

  const notification: FullTaskAssignmentNotification = {
    actionDescription: null,
    actorUserId: actor.id,
    actor,
    annotationId: null,
    canvasId: null,
    collaboratorId: 'abddd',
    collectionId: 'collection-adsfafd',
    collectionTitle: null,
    commentId: null,
    commentText: null,
    componentType: null,
    createdAt: new Date('2019-02-02'),
    deletedAt: null,
    designId: 'abc-1222343',
    designImageIds: [],
    designTitle: null,
    hasAttachments: false,
    id: 'abddfad-ddd',
    measurementId: null,
    readAt: null,
    recipientUserId: 'zzzz-2222',
    sectionId: null,
    sentEmailAt: null,
    stageId: '112-333',
    taskId: 'abc-123',
    taskTitle: 'Some title',
    type: NotificationType.TASK_ASSIGNMENT
  };
  const response = await announceNotificationCreation(notification);

  t.deepEqual(response, {
    actorId: notification.actorUserId,
    resource: { foo: 'bar' },
    targetId: notification.recipientUserId,
    type: 'notification'
  });
  t.equal(sendStub.callCount, 1);
  t.equal(createStub.callCount, 1);
});

test('sendMessage can early return if the notification is missing data', async (t: tape.Test) => {
  const sendStub = sandbox()
    .stub(SendMessageService, 'sendMessage')
    .resolves({});
  const createStub = sandbox()
    .stub(CreateNotificationService, 'createNotificationMessage')
    .resolves(null);
  const { user: actor } = await createUser({ withSession: false });

  const notification: FullTaskAssignmentNotification = {
    actionDescription: null,
    actorUserId: actor.id,
    actor,
    annotationId: null,
    canvasId: null,
    collaboratorId: 'abddd',
    collectionId: 'collection-adsfafd',
    collectionTitle: null,
    commentId: null,
    commentText: null,
    componentType: null,
    createdAt: new Date('2019-02-02'),
    deletedAt: null,
    designId: 'abc-1222343',
    designImageIds: [],
    designTitle: null,
    hasAttachments: false,
    id: 'abddfad-ddd',
    measurementId: null,
    readAt: null,
    recipientUserId: 'zzzz-2222',
    sectionId: null,
    sentEmailAt: null,
    stageId: '112-333',
    taskId: 'abc-123',
    taskTitle: 'Some title',
    type: NotificationType.TASK_ASSIGNMENT
  };
  const response = await announceNotificationCreation(notification);

  t.equal(response, null);
  t.equal(sendStub.callCount, 0);
  t.equal(createStub.callCount, 1);
});

test('sendMessage can early return if the notification is missing data', async (t: tape.Test) => {
  const sendStub = sandbox()
    .stub(SendMessageService, 'sendMessage')
    .resolves({});
  const createStub = sandbox()
    .stub(CreateNotificationService, 'createNotificationMessage')
    .resolves({ foo: 'bar' });
  const { user: actor } = await createUser({ withSession: false });

  const notification: FullInviteCollaboratorNotification = {
    actionDescription: null,
    actorUserId: actor.id,
    actor,
    annotationId: null,
    canvasId: null,
    collaboratorId: 'abddd',
    collectionId: 'collection-adsfafd',
    collectionTitle: 'A collection',
    commentId: null,
    commentText: null,
    componentType: null,
    createdAt: new Date('2019-02-02'),
    deletedAt: null,
    designId: 'abc-1222343',
    designImageIds: [],
    designTitle: 'A design',
    hasAttachments: false,
    id: 'abddfad-ddd',
    measurementId: null,
    readAt: null,
    recipientUserId: null,
    sectionId: null,
    sentEmailAt: new Date('2019-02-02'),
    stageId: null,
    taskId: null,
    taskTitle: null,
    type: NotificationType.INVITE_COLLABORATOR
  };
  const response = await announceNotificationCreation(notification);

  t.equal(response, null);
  t.equal(sendStub.callCount, 0);
  t.equal(createStub.callCount, 1);
});
