import * as tape from 'tape';
import * as uuid from 'node-uuid';
import * as sinon from 'sinon';

import { sandbox, test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import { NotificationType } from '../../components/notifications/domain-object';
import * as NotificationsService from './index';
import * as CollaboratorsDAO from '../../components/collaborators/dao';
import * as CollaboratorTasksDAO from '../../dao/collaborator-tasks';
import * as TasksDAO from '../../dao/tasks';
import * as TaskEventsDAO from '../../dao/task-events';
import * as DesignStagesDAO from '../../dao/product-design-stages';
import * as DesignStageTasksDAO from '../../dao/product-design-stage-tasks';
import * as CommentsDAO from '../../components/comments/dao';
import * as TaskCommentsDAO from '../../dao/task-comments';
import * as CollectionsDAO from '../../dao/collections';
import * as DesignsDAO from '../../dao/product-designs';
import * as EmailService from '../../services/email';
import generateCanvas from '../../test-helpers/factories/product-design-canvas';
import generateAnnotation from '../../test-helpers/factories/product-design-canvas-annotation';
import generateCollection from '../../test-helpers/factories/collection';
import * as SlackService from '../../services/slack';
import * as Config from '../../config';
import generateMeasurement from '../../test-helpers/factories/product-design-canvas-measurement';

test('sendDesignOwnerAnnotationCreateNotification', async (t: tape.Test) => {
  const { user: user } = await createUser({ withSession: false });
  const { user: owner } = await createUser({ withSession: false });

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: owner.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'AW19'
  });
  const design = await DesignsDAO.create({
    productType: 'A product type',
    title: 'A design',
    userId: owner.id
  });
  await CollectionsDAO.addDesign(collection.id, design.id);

  const { canvas } = await generateCanvas({
    createdBy: owner.id,
    designId: design.id
  });
  const { annotation } = await generateAnnotation({ canvasId: canvas.id });

  const nullNotification = await NotificationsService.sendDesignOwnerAnnotationCreateNotification(
    annotation.id,
    canvas.id,
    owner.id
  );
  t.equal(nullNotification, null, 'A notification will not be made if the actor is the recipient');

  const notification = await NotificationsService.sendDesignOwnerAnnotationCreateNotification(
    annotation.id,
    canvas.id,
    user.id
  );
  if (!notification) { throw new Error('Expected a notification!'); }
  const {
    actorUserId,
    canvasId,
    collectionId,
    designId,
    recipientUserId,
    type
  } = notification;
  t.equal(actorUserId, user.id);
  t.equal(canvasId, canvas.id);
  t.equal(collectionId, collection.id);
  t.equal(designId, design.id);
  t.equal(recipientUserId, owner.id);
  t.equal(type, NotificationType.ANNOTATION_CREATE);
});

test('sendDesignOwnerMeasurementCreateNotification', async (t: tape.Test) => {
  const { user: user } = await createUser({ withSession: false });
  const { user: owner } = await createUser({ withSession: false });

  const { collection } = await generateCollection({ createdBy: owner.id });
  const design = await DesignsDAO.create({
    productType: 'A product type',
    title: 'A design',
    userId: owner.id
  });
  await CollectionsDAO.addDesign(collection.id, design.id);

  const { canvas } = await generateCanvas({
    createdBy: owner.id,
    designId: design.id
  });
  const { measurement } = await generateMeasurement({ canvasId: canvas.id });

  const nullNotification = await NotificationsService.sendDesignOwnerMeasurementCreateNotification(
    measurement.id,
    canvas.id,
    owner.id
  );
  t.equal(nullNotification, null, 'A notification will not be made if the actor is the recipient');

  const notification = await NotificationsService.sendDesignOwnerMeasurementCreateNotification(
    measurement.id,
    canvas.id,
    user.id
  );
  if (!notification) { throw new Error('Expected a notification!'); }
  const {
    actorUserId,
    canvasId,
    collectionId,
    designId,
    measurementId,
    recipientUserId,
    type
  } = notification;
  t.equal(actorUserId, user.id);
  t.equal(canvasId, canvas.id);
  t.equal(collectionId, collection.id);
  t.equal(designId, design.id);
  t.equal(measurementId, measurement.id);
  t.equal(recipientUserId, owner.id);
  t.equal(type, NotificationType.MEASUREMENT_CREATE);
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
    userId: userOne.user.id
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

test('sendTaskAssignmentNotification does not send if assigned to self', async (t: tape.Test) => {
  const { user } = await createUser();

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'AW19'
  });
  const design = await DesignsDAO.create({
    productType: 'A product type',
    title: 'A design',
    userId: user.id
  });
  await CollectionsDAO.addDesign(collection.id, design.id);
  const designStage = await DesignStagesDAO.create({
    description: '',
    designId: design.id,
    ordering: 0,
    title: 'test'
  });
  const collaborator = await CollaboratorsDAO.create({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });

  const taskOne = await TasksDAO.create(uuid.v4());
  await TaskEventsDAO.create({
    createdBy: user.id,
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
    collaboratorId: collaborator.id,
    taskId: taskOne.id
  });

  const notifications = await NotificationsService
    .sendTaskAssignmentNotification(taskOne.id, user.id, [collaborator.id]);

  t.equal(
    notifications.length,
    0,
    'Does not create a task assignment notification'
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

test('sendDesignerSubmitCollection', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const { user: calaOps } = await createUser({ withSession: false });
  const { collection } = await generateCollection({ createdBy: user.id });

  const slackStub = sandbox().stub(SlackService, 'enqueueSend').returns(Promise.resolve());
  sandbox().stub(Config, 'CALA_OPS_USER_ID').value(calaOps.id);

  const notification = await NotificationsService.sendDesignerSubmitCollection(
    collection.id,
    user.id
  );

  t.deepEqual(notification.collectionId, collection.id);
  t.deepEqual(notification.actorUserId, user.id);
  t.deepEqual(notification.recipientUserId, calaOps.id);

  // Sends a slack notification.
  sinon.assert.callCount(slackStub, 1);
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
