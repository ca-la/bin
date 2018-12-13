import * as tape from 'tape';
import * as uuid from 'node-uuid';
import * as sinon from 'sinon';

import { sandbox, test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import Notification, { NotificationType } from '../../domain-objects/notification';
import * as NotificationsService from './index';
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

test('sendDesignUpdateNotification', async (t: tape.Test) => {
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

  const notifications = await NotificationsService
    .sendDesignUpdateNotifications(design.id, userOne.user.id);

  t.equal(notifications.length, 2, 'Creates a design update notification for each collaborator');
  t.deepEqual(
    notifications.map((n: Notification): NotificationType | null => n.type),
    [NotificationType.DESIGN_UPDATE, NotificationType.DESIGN_UPDATE],
    'Creates two notifications with the same notification type'
  );
});

test('sendTaskCommentCreateNotification', async (t: tape.Test) => {
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

  const notifications = await NotificationsService
    .sendTaskCommentCreateNotification(taskOne.id, comment.id, userOne.user.id);

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

test('sendTaskAssignmentNotification', async (t: tape.Test) => {
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

  const notifications = await NotificationsService
    .sendTaskAssignmentNotification(taskOne.id, userOne.user.id, [collaboratorTwo.id]);

  t.equal(
    notifications.length,
    1,
    'Creates a task assignment notification just for the assignee'
  );
  t.deepEqual(
    notifications[0].recipientUserId,
    userTwo.user.id,
    'Creates a notification for the assignee'
  );
  t.deepEqual(
    notifications[0].type,
    NotificationType.TASK_ASSIGNMENT,
    'Creates the correct notification type'
  );
});

test('sendTaskCompletionNotification', async (t: tape.Test) => {
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

  const notifications = await NotificationsService
    .sendTaskCompletionNotification(taskOne.id, userTwo.user.id);

  t.equal(
    notifications.length,
    1,
    'Creates a task completion notification just for the other collaborators'
  );
  t.deepEqual(
    notifications[0].recipientUserId,
    userOne.user.id,
    'Creates a notification for the non-actor collaborators'
  );
  t.deepEqual(
    notifications[0].type,
    NotificationType.TASK_COMPLETION,
    'Creates the correct notification type'
  );
});

test('immediatelySendFullyCostedCollection', async (t: tape.Test) => {
  const admin = await createUser({ withSession: false, role: 'ADMIN' });
  const userOne = await createUser({ withSession: false });
  const userTwo = await createUser({ withSession: false });

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: userOne.user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'AW19'
  });
  await CollaboratorsDAO.create({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: userOne.user.id
  });
  await CollaboratorsDAO.create({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: userTwo.user.id
  });
  await CollaboratorsDAO.create({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: 'test@ca.la',
    userId: null
  });

  const emailStub = sandbox().stub(EmailService, 'enqueueSend').returns(Promise.resolve());

  const notifications = await NotificationsService.immediatelySendFullyCostedCollection(
    collection.id,
    admin.user.id
  );

  // A notification is sent for every collaborator.
  sinon.assert.callCount(emailStub, 2);
  t.equal(notifications.length, 2, 'Two notifications are created');
  t.equal(notifications[0].type, NotificationType.COMMIT_COST_INPUTS);
  t.equal(notifications[1].type, NotificationType.COMMIT_COST_INPUTS);
  t.not(notifications[0].sentEmailAt, null, 'Notification is marked as sent');
  t.not(notifications[1].sentEmailAt, null, 'Notification is marked as sent');
  t.equal(notifications[0].actorUserId, admin.user.id);
  t.equal(notifications[1].actorUserId, admin.user.id);
  t.equal(notifications[0].recipientUserId, userOne.user.id);
  t.equal(notifications[1].recipientUserId, userTwo.user.id);
});

test('immediatelySendInviteCollaborator', async (t: tape.Test) => {
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

  const notification = await NotificationsService.immediatelySendInviteCollaborator({
    actorId: userOne.user.id,
    collectionId: null,
    designId: null,
    targetCollaboratorId: collaboratorOne.id,
    targetUserId: null
  });

  sinon.assert.callCount(emailStub, 1);
  t.not(notification.sentEmailAt, null, 'Notification is marked as sent');
});
