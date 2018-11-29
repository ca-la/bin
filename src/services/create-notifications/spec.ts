import * as tape from 'tape';
import * as uuid from 'node-uuid';
import * as sinon from 'sinon';

import { sandbox, test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import Notification, { NotificationType } from '../../domain-objects/notification';
import {
  immediatelySendInviteCollaborator,
  sendDesignUpdateNotifications,
  sendTaskCommentCreateNotification
} from './index';
import * as CollaboratorsDAO from '../../dao/collaborators';
import * as CollaboratorTasksDAO from '../../dao/collaborator-tasks';
import * as TasksDAO from '../../dao/tasks';
import * as TaskEventsDAO from '../../dao/task-events';
import * as DesignStagesDAO from '../../dao/product-design-stages';
import * as DesignStageTasksDAO from '../../dao/product-design-stage-tasks';
import * as CommentsDAO from '../../dao/comments';
import * as TaskCommentsDAO from '../../dao/task-comments';
import * as CollectionsDAO from '../../dao/collections';
import * as DesignsDAO from '../../dao/product-designs';
import * as EmailService from '../../services/email';

test('Notifications DAO supports finding outstanding notifications', async (t: tape.Test) => {
  const userOne = await createUser();
  const userTwo = await createUser();

  const design = await DesignsDAO.create({
    productType: 'A product type',
    title: 'A design',
    userId: userOne.user.id
  });

  await CollaboratorsDAO.create({
    collectionId: null,
    designId: design.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: userOne.user.id
  });
  await CollaboratorsDAO.create({
    collectionId: null,
    designId: design.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: userTwo.user.id
  });

  const notifications = await sendDesignUpdateNotifications(design.id, userOne.user.id);

  t.equal(notifications.length, 2, 'Creates a design update notification for each collaborator');
  t.deepEqual(
    notifications.map((n: Notification): NotificationType | null => n.type),
    [NotificationType.DESIGN_UPDATE, NotificationType.DESIGN_UPDATE],
    'Creates two notifications with the same notification type'
  );
});

test('Notifications DAO supports finding outstanding notifications', async (t: tape.Test) => {
  const userOne = await createUser();
  const userTwo = await createUser();

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: userOne.user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'AW19'
  });
  const design = await DesignsDAO.create({
    productType: 'A product type',
    title: 'A design',
    userId: userOne.user.id
  });
  await CollectionsDAO.addDesign(collection.id, design.id);

  const designStage = await DesignStagesDAO.create({
    description: '',
    designId: design.id,
    ordering: 0,
    title: 'test'
  });

  await CollaboratorsDAO.create({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: userOne.user.id
  });
  const collaboratorTwo = await CollaboratorsDAO.create({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: userTwo.user.id
  });

  const taskOne = await TasksDAO.create(uuid.v4());
  await TaskEventsDAO.create({
    createdBy: userOne.user.id,
    description: '',
    designStageId: designStage.id,
    dueDate: null,
    ordering: 0,
    status: null,
    taskId: taskOne.id,
    title: 'My First Task'
  });
  await DesignStageTasksDAO.create({
    designStageId: designStage.id,
    taskId: taskOne.id
  });

  await CollaboratorTasksDAO.create({
    collaboratorId: collaboratorTwo.id,
    taskId: taskOne.id
  });

  const comment = await CommentsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: 'A comment',
    userEmail: userOne.user.email,
    userId: userOne.user.id,
    userName: userOne.user.name
  });
  await TaskCommentsDAO.create({
    commentId: comment.id,
    taskId: taskOne.id
  });

  const notifications = await sendTaskCommentCreateNotification(
    taskOne.id,
    comment.id,
    userOne.user.id
  );

  t.equal(
    notifications.length,
    1,
    'Creates a task comment notification just for the assignee'
  );
  t.deepEqual(
    notifications[0].recipientUserId,
    userTwo.user.id,
    'Creates a notification for the assignee'
  );
  t.deepEqual(
    notifications[0].type,
    NotificationType.TASK_COMMENT_CREATE,
    'Creates the correct notification type'
  );
});

test('Notifications DAO supports sending an invite notification', async (t: tape.Test) => {
  const userOne = await createUser();
  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: userOne.user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'AW19'
  });
  const collaboratorOne = await CollaboratorsDAO.create({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: 'test@ca.la',
    userId: null
  });

  const emailStub = sandbox().stub(EmailService, 'enqueueSend').returns(Promise.resolve());

  const notification = await immediatelySendInviteCollaborator({
    actorId: userOne.user.id,
    collectionId: null,
    designId: null,
    targetCollaboratorId: collaboratorOne.id,
    targetUserId: null
  });

  sinon.assert.callCount(emailStub, 1);
  t.not(notification.sentEmailAt, null, 'Notification is marked as sent');
});
