import tape from 'tape';
import uuid from 'node-uuid';
import sinon from 'sinon';
import Knex from 'knex';
import { isEqual } from 'lodash';

import { sandbox, test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import { NotificationType } from '../../components/notifications/domain-object';
import * as NotificationsService from './index';
import * as CollaboratorTasksDAO from '../../dao/collaborator-tasks';
import * as NotificationsDAO from '../../components/notifications/dao';
import * as TasksDAO from '../../dao/tasks';
import * as TaskEventsDAO from '../../dao/task-events';
import * as DesignStagesDAO from '../../dao/product-design-stages';
import * as DesignStageTasksDAO from '../../dao/product-design-stage-tasks';
import * as CommentsDAO from '../../components/comments/dao';
import * as TaskCommentsDAO from '../../components/task-comments/dao';
import * as AnnotationCommentsDAO from '../../components/annotation-comments/dao';
import * as CollectionsDAO from '../../components/collections/dao';
import * as ApprovalStepCommentDAO from '../../components/approval-step-comments/dao';
import DesignsDAO from '../../components/product-designs/dao';
import EmailService from '../../services/email';
import generateCanvas from '../../test-helpers/factories/product-design-canvas';
import generateAnnotation from '../../test-helpers/factories/product-design-canvas-annotation';
import generateCollection from '../../test-helpers/factories/collection';
import * as SlackService from '../../services/slack';
import Config from '../../config';
import generateMeasurement from '../../test-helpers/factories/product-design-canvas-measurement';
import generateCollaborator from '../../test-helpers/factories/collaborator';
import * as NotificationAnnouncer from '../../components/iris/messages/notification';
import { addDesign } from '../../test-helpers/collections';
import db from '../db';
import generateApprovalStep from '../../test-helpers/factories/design-approval-step';
import createDesign from '../create-design';
import ApprovalStep, {
  ApprovalStepState
} from '../../components/approval-steps/domain-object';
import * as ApprovalStepsDAO from '../../components/approval-steps/dao';
import * as ApprovalStepTaskDAO from '../../components/approval-step-tasks/dao';

test('sendDesignOwnerAnnotationCommentCreateNotification', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const { user: user } = await createUser({ withSession: false });
  const { user: owner } = await createUser({ withSession: false });

  const design = await DesignsDAO.create({
    productType: 'A product type',
    title: 'A design',
    userId: owner.id
  });

  const { canvas } = await generateCanvas({
    createdBy: owner.id,
    designId: design.id
  });
  const { annotation } = await generateAnnotation({ canvasId: canvas.id });
  const ownerComment = await CommentsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: 'A comment',
    userId: owner.id
  });
  await AnnotationCommentsDAO.create({
    annotationId: annotation.id,
    commentId: ownerComment.id
  });
  const otherComment = await CommentsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: 'A comment',
    userId: owner.id
  });
  await AnnotationCommentsDAO.create({
    annotationId: annotation.id,
    commentId: otherComment.id
  });

  const nullNotification = await NotificationsService.sendDesignOwnerAnnotationCommentCreateNotification(
    annotation.id,
    canvas.id,
    ownerComment.id,
    owner.id,
    [],
    []
  );
  t.equal(
    nullNotification,
    null,
    'A notification will not be made if the actor is the recipient'
  );

  const mentionedNotification = await NotificationsService.sendDesignOwnerAnnotationCommentCreateNotification(
    annotation.id,
    canvas.id,
    ownerComment.id,
    user.id,
    [owner.id],
    []
  );
  t.equal(
    mentionedNotification,
    null,
    'A notification will not be made if the owner is mentioned'
  );

  const replyNotification = await NotificationsService.sendDesignOwnerAnnotationCommentCreateNotification(
    annotation.id,
    canvas.id,
    ownerComment.id,
    user.id,
    [],
    [owner.id]
  );
  t.equal(
    replyNotification,
    null,
    'A notification will not be made if the owner is already notified from a thread'
  );

  const notification = await NotificationsService.sendDesignOwnerAnnotationCommentCreateNotification(
    annotation.id,
    canvas.id,
    otherComment.id,
    user.id,
    [],
    []
  );
  if (!notification) {
    throw new Error('Expected a notification!');
  }
  const {
    actorUserId,
    canvasId,
    collectionId,
    commentId,
    designId,
    recipientUserId,
    type
  } = notification;
  t.equal(actorUserId, user.id);
  t.equal(canvasId, canvas.id);
  t.equal(collectionId, null);
  t.equal(commentId, otherComment.id);
  t.equal(designId, design.id);
  t.equal(recipientUserId, owner.id);
  t.equal(type, NotificationType.ANNOTATION_COMMENT_CREATE);
});

test('sendAnnotationCommentMentionNotification', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const { user: user } = await createUser({
    withSession: false,
    role: 'ADMIN'
  });
  const { user: owner } = await createUser({
    withSession: false,
    role: 'ADMIN'
  });

  const design = await DesignsDAO.create({
    productType: 'A product type',
    title: 'A design',
    userId: owner.id
  });

  const { canvas } = await generateCanvas({
    createdBy: owner.id,
    designId: design.id
  });
  const { annotation } = await generateAnnotation({ canvasId: canvas.id });
  const ownerComment = await CommentsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: 'A comment',
    userId: owner.id
  });
  await AnnotationCommentsDAO.create({
    annotationId: annotation.id,
    commentId: ownerComment.id
  });

  const notification = await NotificationsService.sendAnnotationCommentMentionNotification(
    annotation.id,
    canvas.id,
    ownerComment.id,
    owner.id,
    user.id
  );
  if (!notification) {
    throw new Error('Expected a notification!');
  }
  const {
    actorUserId,
    canvasId,
    collectionId,
    commentId,
    designId,
    recipientUserId,
    type
  } = notification;
  t.equal(actorUserId, owner.id, 'Actor should be the owner');
  t.equal(canvasId, canvas.id, 'Canvases should match');
  t.equal(collectionId, null, 'CollectionId should be null');
  t.equal(commentId, ownerComment.id, 'Comment should be the owners comment');
  t.equal(designId, design.id, 'DesignIds should match');
  t.equal(recipientUserId, user.id, 'Recipient should be the user');
  t.equal(
    type,
    NotificationType.ANNOTATION_COMMENT_MENTION,
    'Notification type should be ANNOTATION_COMMENT_MENTION'
  );
});

test('sendAnnotationCommentReplyNotification', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const { user: user } = await createUser({
    withSession: false,
    role: 'ADMIN'
  });
  const { user: owner } = await createUser({
    withSession: false,
    role: 'ADMIN'
  });

  const design = await DesignsDAO.create({
    productType: 'A product type',
    title: 'A design',
    userId: owner.id
  });

  const { canvas } = await generateCanvas({
    createdBy: owner.id,
    designId: design.id
  });
  const { annotation } = await generateAnnotation({ canvasId: canvas.id });
  const ownerComment = await CommentsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: 'A comment',
    userId: owner.id
  });
  await AnnotationCommentsDAO.create({
    annotationId: annotation.id,
    commentId: ownerComment.id
  });

  const notification = await db.transaction((trx: Knex.Transaction) => {
    return NotificationsService.sendAnnotationCommentReplyNotification(
      trx,
      annotation.id,
      canvas.id,
      design.id,
      ownerComment.id,
      owner.id,
      user.id
    );
  });
  if (!notification) {
    throw new Error('Expected a notification!');
  }
  const {
    actorUserId,
    canvasId,
    collectionId,
    commentId,
    designId,
    recipientUserId,
    type
  } = notification;
  t.equal(actorUserId, owner.id, 'Actor should be the owner');
  t.equal(canvasId, canvas.id, 'Canvases should match');
  t.equal(collectionId, null, 'CollectionId should be null');
  t.equal(commentId, ownerComment.id, 'Comment should be the owners comment');
  t.equal(designId, design.id, 'DesignIds should match');
  t.equal(recipientUserId, user.id, 'Recipient should be the user');
  t.equal(
    type,
    NotificationType.ANNOTATION_COMMENT_REPLY,
    'Notification type should be ANNOTATION_COMMENT_REPLY'
  );
});

test('sendDesignOwnerMeasurementCreateNotification', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const { user: user } = await createUser({ withSession: false });
  const { user: owner } = await createUser({ withSession: false });

  const { collection } = await generateCollection({ createdBy: owner.id });
  const design = await DesignsDAO.create({
    productType: 'A product type',
    title: 'A design',
    userId: owner.id
  });
  await addDesign(collection.id, design.id);

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
  t.equal(
    nullNotification,
    null,
    'A notification will not be made if the actor is the recipient'
  );

  const notification = await NotificationsService.sendDesignOwnerMeasurementCreateNotification(
    measurement.id,
    canvas.id,
    user.id
  );
  if (!notification) {
    throw new Error('Expected a notification!');
  }
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

  const { measurement: measurement2 } = await generateMeasurement({
    canvasId: canvas.id
  });

  await NotificationsService.sendDesignOwnerMeasurementCreateNotification(
    measurement2.id,
    canvas.id,
    user.id
  );

  const { canvas: canvas2 } = await generateCanvas({
    createdBy: owner.id,
    designId: design.id
  });
  const { measurement: measurement3 } = await generateMeasurement({
    canvasId: canvas2.id
  });
  await NotificationsService.sendDesignOwnerMeasurementCreateNotification(
    measurement3.id,
    canvas.id,
    user.id
  );

  const notifications = await db.transaction((trx: Knex.Transaction) => {
    return NotificationsDAO.findByUserId(trx, owner.id, {
      limit: 10,
      offset: 0
    });
  });

  t.equal(
    notifications.length,
    3,
    'Three measurement notifications are returned'
  );
});

test('sendTaskCommentCreateNotification', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
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
  await addDesign(collection.id, design.id);

  const designStage = await DesignStagesDAO.create({
    description: '',
    designId: design.id,
    ordering: 0,
    title: 'test'
  });

  await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: userOne.user.id
  });
  const { collaborator: collaboratorTwo } = await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: userTwo.user.id
  });

  const taskOne = await TasksDAO.create();
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

  const notifications = await db.transaction((trx: Knex.Transaction) =>
    NotificationsService.sendTaskCommentCreateNotification(trx, {
      taskId: taskOne.id,
      commentId: comment.id,
      actorId: userOne.user.id,
      mentionedUserIds: [],
      threadUserIds: []
    })
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

test('sendTaskCommentMentionNotification', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const userOne = await createUser({ role: 'ADMIN' });
  const userTwo = await createUser({ role: 'ADMIN' });

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
  await addDesign(collection.id, design.id);

  const designStage = await DesignStagesDAO.create({
    description: '',
    designId: design.id,
    ordering: 0,
    title: 'test'
  });

  await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: userOne.user.id
  });
  const { collaborator: collaboratorTwo } = await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: userTwo.user.id
  });

  const taskOne = await TasksDAO.create();
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

  const notification = await NotificationsService.sendTaskCommentMentionNotification(
    {
      taskId: taskOne.id,
      commentId: comment.id,
      actorId: userOne.user.id,
      recipientId: userTwo.user.id
    }
  );

  if (!notification) {
    return t.fail('Notification Failed to create');
  }

  t.deepEqual(
    notification.recipientUserId,
    userTwo.user.id,
    'Creates a notification for the mentioned user'
  );
  t.deepEqual(
    notification.type,
    NotificationType.TASK_COMMENT_MENTION,
    'Creates the correct notification type'
  );
});

test('sendTaskCommentReplyNotification', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const userOne = await createUser({ role: 'ADMIN' });
  const userTwo = await createUser({ role: 'ADMIN' });

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
  await addDesign(collection.id, design.id);

  const designStage = await DesignStagesDAO.create({
    description: '',
    designId: design.id,
    ordering: 0,
    title: 'test'
  });

  await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: userOne.user.id
  });
  const { collaborator: collaboratorTwo } = await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: userTwo.user.id
  });

  const taskOne = await TasksDAO.create();
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

  const reply = await CommentsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: comment.id,
    text: 'A comment',
    userId: userOne.user.id
  });
  await TaskCommentsDAO.create({
    commentId: reply.id,
    taskId: taskOne.id
  });

  const notification = await db.transaction(async (trx: Knex.Transaction) => {
    return NotificationsService.sendTaskCommentReplyNotification(trx, {
      taskId: taskOne.id,
      commentId: reply.id,
      actorId: userOne.user.id,
      recipientId: userTwo.user.id
    });
  });
  if (!notification) {
    return t.fail('Notification Failed to create');
  }

  t.deepEqual(
    notification.recipientUserId,
    userTwo.user.id,
    'Creates a notification for the mentioned user'
  );
  t.deepEqual(
    notification.type,
    NotificationType.TASK_COMMENT_REPLY,
    'Creates the correct notification type'
  );
});

test('sendTaskAssignmentNotification', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
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
  await addDesign(collection.id, design.id);
  const designStage = await DesignStagesDAO.create({
    description: '',
    designId: design.id,
    ordering: 0,
    title: 'test'
  });
  await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: userOne.user.id
  });
  const { collaborator: collaboratorTwo } = await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: userTwo.user.id
  });
  const taskOne = await TasksDAO.create();
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

  const notifications = await NotificationsService.sendTaskAssignmentNotification(
    taskOne.id,
    userOne.user.id,
    [collaboratorTwo.id]
  );

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
  await addDesign(collection.id, design.id);
  const designStage = await DesignStagesDAO.create({
    description: '',
    designId: design.id,
    ordering: 0,
    title: 'test'
  });
  const { collaborator } = await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });

  const taskOne = await TasksDAO.create();
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

  const notifications = await NotificationsService.sendTaskAssignmentNotification(
    taskOne.id,
    user.id,
    [collaborator.id]
  );

  t.equal(
    notifications.length,
    0,
    'Does not create a task assignment notification'
  );
});

test('sendTaskAssignmentNotification does not send if assigned to collaborator without an account', async (t: tape.Test) => {
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
  await addDesign(collection.id, design.id);
  const designStage = await DesignStagesDAO.create({
    description: '',
    designId: design.id,
    ordering: 0,
    title: 'test'
  });
  await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });
  const { collaborator: collaborator2 } = await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: 'test@test.test',
    userId: null
  });

  const taskOne = await TasksDAO.create();
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
    collaboratorId: collaborator2.id,
    taskId: taskOne.id
  });

  const notifications = await NotificationsService.sendTaskAssignmentNotification(
    taskOne.id,
    user.id,
    [collaborator2.id]
  );

  t.equal(
    notifications.length,
    0,
    'Does not create a task assignment notification'
  );
});

test('sendTaskCompletionNotification', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
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
  await addDesign(collection.id, design.id);
  const designStage = await DesignStagesDAO.create({
    description: '',
    designId: design.id,
    ordering: 0,
    title: 'test'
  });
  await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: userOne.user.id
  });
  const { collaborator: collaboratorTwo } = await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: userTwo.user.id
  });
  await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: 'test@test.test',
    userId: null
  });
  const taskOne = await TasksDAO.create();
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

  const notifications = await NotificationsService.sendTaskCompletionNotification(
    taskOne.id,
    userTwo.user.id
  );

  t.equal(
    notifications.length,
    1,
    'Creates a task completion notification just for the other collaborators with users'
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
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const { user } = await createUser({ withSession: false });
  const { user: calaOps } = await createUser({ withSession: false });
  const { collection } = await generateCollection({ createdBy: user.id });

  const slackStub = sandbox()
    .stub(SlackService, 'enqueueSend')
    .returns(Promise.resolve());
  sandbox()
    .stub(Config, 'CALA_OPS_USER_ID')
    .value(calaOps.id);

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
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
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
  await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: userOne.user.id
  });
  await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: userTwo.user.id
  });
  await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: 'test@ca.la',
    userId: null
  });

  const emailStub = sandbox()
    .stub(EmailService, 'enqueueSend')
    .returns(Promise.resolve());

  const notifications = await NotificationsService.immediatelySendFullyCostedCollection(
    collection.id,
    admin.user.id
  );

  // A notification is sent for every collaborator.
  sinon.assert.callCount(emailStub, 2);
  t.equal(notifications.length, 2, 'Two notifications are created');
  t.true(
    isEqual(
      new Set([
        {
          type: notifications[0].type,
          actorUserId: notifications[0].actorUserId,
          recipientId: notifications[0].recipientUserId
        },
        {
          type: notifications[1].type,
          actorUserId: notifications[1].actorUserId,
          recipientId: notifications[1].recipientUserId
        }
      ]),
      new Set([
        {
          type: NotificationType.COMMIT_COST_INPUTS,
          actorUserId: admin.user.id,
          recipientId: userOne.user.id
        },
        {
          type: NotificationType.COMMIT_COST_INPUTS,
          actorUserId: admin.user.id,
          recipientId: userTwo.user.id
        }
      ])
    )
  );

  t.false(
    isEqual(
      new Set([notifications[0].sentEmailAt, notifications[1].sentEmailAt]),
      new Set([null, null])
    ),
    'Emails are sent immediately'
  );
});

test('immediatelySendInviteCollaborator', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const userOne = await createUser();
  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: userOne.user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'AW19'
  });
  const { collaborator: collaboratorOne } = await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: 'test@ca.la',
    userId: null
  });

  const emailStub = sandbox()
    .stub(EmailService, 'enqueueSend')
    .returns(Promise.resolve());

  const notification = await NotificationsService.immediatelySendInviteCollaborator(
    {
      actorId: userOne.user.id,
      collectionId: collection.id,
      designId: null,
      targetCollaboratorId: collaboratorOne.id,
      targetUserId: null
    }
  );

  sinon.assert.callCount(emailStub, 1);
  t.not(notification.sentEmailAt, null, 'Notification is marked as sent');
});

test('sendApprovalStepCommentReplyNotification', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const { user: user } = await createUser({
    withSession: false,
    role: 'ADMIN'
  });
  const { user: owner } = await createUser({
    withSession: false,
    role: 'ADMIN'
  });

  const design = await DesignsDAO.create({
    productType: 'A product type',
    title: 'A design',
    userId: owner.id
  });
  const { approvalStep } = await db.transaction((trx: Knex.Transaction) =>
    generateApprovalStep(trx, { designId: design.id })
  );

  const ownerComment = await CommentsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: 'A comment',
    userId: owner.id
  });
  await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepCommentDAO.create(trx, {
      approvalStepId: approvalStep.id,
      commentId: ownerComment.id
    })
  );

  const notification = await db.transaction((trx: Knex.Transaction) => {
    return NotificationsService.sendApprovalStepCommentReplyNotification(trx, {
      approvalStepId: approvalStep.id,
      commentId: ownerComment.id,
      actorId: owner.id,
      recipientId: user.id
    });
  });
  if (!notification) {
    throw new Error('Expected a notification!');
  }
  const {
    actorUserId,
    collectionId,
    commentId,
    designId,
    recipientUserId,
    type
  } = notification;
  t.equal(actorUserId, owner.id, 'Actor should be the owner');
  t.equal(collectionId, null, 'CollectionId should be null');
  t.equal(commentId, ownerComment.id, 'Comment should be the owners comment');
  t.equal(designId, design.id, 'DesignIds should match');
  t.equal(recipientUserId, user.id, 'Recipient should be the user');
  t.equal(
    type,
    NotificationType.APPROVAL_STEP_COMMENT_REPLY,
    'Notification type should be APPROVAL_STEP_COMMENT_REPLY'
  );
});

test('sendDesignOwnerAnnotationCommentCreateNotification', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const { user: user } = await createUser({
    withSession: false,
    role: 'ADMIN'
  });
  const { user: owner } = await createUser({
    withSession: false,
    role: 'ADMIN'
  });

  const design = await DesignsDAO.create({
    productType: 'A product type',
    title: 'A design',
    userId: owner.id
  });
  const { approvalStep } = await db.transaction((trx: Knex.Transaction) =>
    generateApprovalStep(trx, { designId: design.id })
  );

  const ownerComment = await CommentsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: 'A comment',
    userId: owner.id
  });
  await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepCommentDAO.create(trx, {
      approvalStepId: approvalStep.id,
      commentId: ownerComment.id
    })
  );

  const otherComment = await CommentsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: 'A comment',
    userId: owner.id
  });
  await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepCommentDAO.create(trx, {
      approvalStepId: approvalStep.id,
      commentId: otherComment.id
    })
  );

  const nullNotification = await db.transaction((trx: Knex.Transaction) =>
    NotificationsService.sendDesignOwnerApprovalStepCommentCreateNotification(
      trx,
      approvalStep.id,
      ownerComment.id,
      owner.id,
      [],
      []
    )
  );
  t.equal(
    nullNotification,
    null,
    'A notification will not be made if the actor is the recipient'
  );

  const mentionedNotification = await db.transaction((trx: Knex.Transaction) =>
    NotificationsService.sendDesignOwnerApprovalStepCommentCreateNotification(
      trx,
      approvalStep.id,
      ownerComment.id,
      user.id,
      [owner.id],
      []
    )
  );

  t.equal(
    mentionedNotification,
    null,
    'A notification will not be made if the owner is mentioned'
  );

  const replyNotification = await db.transaction((trx: Knex.Transaction) =>
    NotificationsService.sendDesignOwnerApprovalStepCommentCreateNotification(
      trx,
      approvalStep.id,
      ownerComment.id,
      user.id,
      [],
      [owner.id]
    )
  );
  t.equal(
    replyNotification,
    null,
    'A notification will not be made if the owner is already notified from a thread'
  );

  const notification = await db.transaction((trx: Knex.Transaction) =>
    NotificationsService.sendDesignOwnerApprovalStepCommentCreateNotification(
      trx,
      approvalStep.id,
      otherComment.id,
      user.id,
      [],
      []
    )
  );
  if (!notification) {
    throw new Error('Expected a notification!');
  }
  const {
    actorUserId,
    collectionId,
    commentId,
    designId,
    recipientUserId,
    type
  } = notification;
  t.equal(actorUserId, user.id);
  t.equal(collectionId, null);
  t.equal(commentId, otherComment.id);
  t.equal(designId, design.id);
  t.equal(recipientUserId, owner.id);
  t.equal(type, NotificationType.APPROVAL_STEP_COMMENT_CREATE);
});

test('findTaskAssets returns proper assets of stage task', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const design = await createDesign({
    productType: 'test',
    title: 'test',
    userId: user.id
  });
  const stage = await DesignStagesDAO.create({
    description: '',
    designId: design.id,
    ordering: 0,
    title: 'test'
  });
  const task = await TasksDAO.create();
  await DesignStageTasksDAO.create({
    designStageId: stage.id,
    taskId: task.id
  });

  const assets = await db.transaction((trx: Knex.Transaction) =>
    NotificationsService.findTaskAssets(trx, task.id)
  );
  t.equal(assets.design.id, design.id);
  t.equal(assets.stage.id, stage.id);
  t.equal(assets.approvalStep, null);
});

test('findTaskAssets returns proper assets of approval step task', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const design = await createDesign({
    productType: 'test',
    title: 'test',
    userId: user.id
  });
  const approvalStep: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: 'Checkout',
    ordering: 0,
    designId: design.id
  };
  await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.createAll(trx, [approvalStep])
  );

  const task = await TasksDAO.create();
  await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepTaskDAO.create(trx, {
      taskId: task.id,
      approvalStepId: approvalStep.id
    })
  );

  const assets = await db.transaction((trx: Knex.Transaction) =>
    NotificationsService.findTaskAssets(trx, task.id)
  );
  t.equal(assets.design.id, design.id);
  t.equal(assets.stage, null);
  t.equal(assets.approvalStep.id, approvalStep.id);
});
