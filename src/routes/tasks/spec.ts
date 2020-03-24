import tape from 'tape';
import uuid from 'node-uuid';
import { TaskStatus } from '@cala/ts-lib';

import User, { Role } from '../../components/users/domain-object';
import {
  DetailsTask,
  DetailsTaskWithAssignees
} from '../../domain-objects/task-event';
import * as TaskEventsDAO from '../../dao/task-events';
import * as TasksDAO from '../../dao/tasks';
import * as CollaboratorTasksDAO from '../../dao/collaborator-tasks';
import * as CollectionsDAO from '../../components/collections/dao';
import * as productDesignStageTasksDAO from '../../dao/product-design-stage-tasks';
import createUser from '../../test-helpers/create-user';
import { authHeader, get, post, put } from '../../test-helpers/http';
import { sandbox, test as originalTest } from '../../test-helpers/fresh';
import * as CreateNotifications from '../../services/create-notifications';
import Collaborator from '../../components/collaborators/domain-objects/collaborator';
import * as CollaboratorsDAO from '../../components/collaborators/dao';
import generateTask from '../../test-helpers/factories/task';
import createDesign from '../../services/create-design';
import generateProductDesignStage from '../../test-helpers/factories/product-design-stage';
import generateCollaborator from '../../test-helpers/factories/collaborator';
import * as AnnounceCommentService from '../../components/iris/messages/task-comment';
import * as StageTemplate from '../../components/tasks/templates';
import { addDesign } from '../../test-helpers/collections';
import * as AddAttachmentLinks from '../../services/add-attachments-links';
import * as AssetLinkAttachment from '../../services/attach-asset-links';
import generateComment from '../../test-helpers/factories/comment';
import { generateDesign } from '../../test-helpers/factories/product-design';

const beforeEach = (): void => {
  sandbox()
    .stub(StageTemplate, 'getTemplatesFor')
    .returns([]);
};

function test(
  description: string,
  testCase: (t: tape.Test) => Promise<void>
): void {
  originalTest(description, async (t: tape.Test) => testCase(t), beforeEach);
}

const BASE_TASK_EVENT: DetailsTask & { assignees: Collaborator[] } = {
  assignees: [],
  collection: {
    createdAt: null,
    id: uuid.v4(),
    title: 'test'
  },
  commentCount: 0,
  createdAt: new Date(),
  lastModifiedAt: new Date(),
  createdBy: uuid.v4(),
  description: 'test',
  design: {
    createdAt: null,
    id: uuid.v4(),
    previewImageUrls: [],
    imageLinks: [],
    title: 'test'
  },
  designStage: {
    createdAt: null,
    id: uuid.v4(),
    ordering: 0,
    title: 'test'
  },
  designStageId: uuid.v4(),
  dueDate: null,
  id: uuid.v4(),
  ordering: 0,
  status: TaskStatus.IN_PROGRESS,
  title: 'test'
};

function createTaskEvents(
  user: User
): (DetailsTask & { assignees: Collaborator[] })[] {
  const taskId = uuid.v4();
  const now = new Date();
  const earlier = new Date(now);
  earlier.setHours(now.getHours() - 1);

  return [
    {
      ...BASE_TASK_EVENT,
      createdAt: now,
      createdBy: user.id,
      id: taskId
    },
    {
      ...BASE_TASK_EVENT,
      createdAt: earlier,
      createdBy: user.id,
      description: 'Changed the description',
      id: taskId
    }
  ];
}

test('GET /tasks/:taskId returns Task', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const taskEvents = createTaskEvents(user);

  const taskId = uuid.v4();
  const taskEvent = { ...BASE_TASK_EVENT, id: taskId };

  sandbox()
    .stub(TaskEventsDAO, 'findById')
    .returns(Promise.resolve(taskEvent));
  sandbox()
    .stub(CollaboratorTasksDAO, 'findAllCollaboratorsByTaskId')
    .resolves([]);

  const [response, body] = await get(`/tasks/${taskEvents[0].id}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200, 'should respond with 200');
  t.deepEqual(
    {
      ...body,
      createdAt: new Date(body.createdAt),
      lastModifiedAt: new Date(body.lastModifiedAt)
    },
    {
      ...taskEvent,
      createdAt: new Date(taskEvent.createdAt),
      lastModifiedAt: new Date(taskEvent.lastModifiedAt)
    },
    'should match body'
  );
});

test('GET /tasks?collectionId=:collectionId returns tasks on collection', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const collectionId = uuid.v4();

  const taskEvents = createTaskEvents(user);

  sandbox()
    .stub(TaskEventsDAO, 'findByCollectionId')
    .resolves(taskEvents);

  const [response, body] = await get(`/tasks?collectionId=${collectionId}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200, 'should respond with 200');
  t.deepEqual(
    body,
    [
      {
        ...taskEvents[0],
        assignees: [],
        createdAt: taskEvents[0].createdAt.toISOString(),
        lastModifiedAt: taskEvents[0].lastModifiedAt.toISOString(),
        id: taskEvents[0].id
      },
      {
        ...taskEvents[1],
        assignees: [],
        createdAt: taskEvents[1].createdAt.toISOString(),
        lastModifiedAt: taskEvents[0].lastModifiedAt.toISOString(),
        id: taskEvents[1].id
      }
    ],
    'should match body'
  );
});

test('GET /tasks?stageId=:stageId returns tasks on design stage', async (t: tape.Test) => {
  const { session, user } = await createUser();

  const stageId = uuid.v4();
  const taskEvents = createTaskEvents(user);

  sandbox()
    .stub(TaskEventsDAO, 'findByStageId')
    .resolves(taskEvents);
  sandbox()
    .stub(CollaboratorTasksDAO, 'findAllCollaboratorsByTaskId')
    .resolves([]);

  const [response, body] = await get(`/tasks?stageId=${stageId}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200, 'should respond with 200');
  t.deepEqual(
    body,
    [
      {
        ...taskEvents[0],
        assignees: [],
        createdAt: taskEvents[0].createdAt.toISOString(),
        lastModifiedAt: taskEvents[0].lastModifiedAt.toISOString(),
        id: taskEvents[0].id
      },
      {
        ...taskEvents[1],
        assignees: [],
        createdAt: taskEvents[1].createdAt.toISOString(),
        lastModifiedAt: taskEvents[0].lastModifiedAt.toISOString(),
        id: taskEvents[1].id
      }
    ],
    'should match body'
  );
});

test('GET /tasks?designId=:designId returns tasks on design', async (t: tape.Test) => {
  const { session, user } = await createUser();

  const designId = uuid.v4();
  const taskEvents = createTaskEvents(user);

  sandbox()
    .stub(TaskEventsDAO, 'findByDesignId')
    .resolves(taskEvents);
  sandbox()
    .stub(CollaboratorTasksDAO, 'findAllCollaboratorsByTaskId')
    .resolves([]);

  const [response, body] = await get(`/tasks?designId=${designId}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200, 'should respond with 200');
  t.deepEqual(
    body,
    [
      {
        ...taskEvents[0],
        assignees: [],
        createdAt: taskEvents[0].createdAt.toISOString(),
        lastModifiedAt: taskEvents[0].lastModifiedAt.toISOString(),
        id: taskEvents[0].id
      },
      {
        ...taskEvents[1],
        assignees: [],
        createdAt: taskEvents[1].createdAt.toISOString(),
        lastModifiedAt: taskEvents[0].lastModifiedAt.toISOString(),
        id: taskEvents[1].id
      }
    ],
    'should match body'
  );
});

test('GET /tasks?userId=:userId returns all tasks for a user', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'FW19'
  });
  const design = await createDesign({
    productType: 'test',
    title: 'design',
    userId: user.id
  });
  await addDesign(collection.id, design.id);
  const { stage } = await generateProductDesignStage(
    { designId: design.id },
    user.id
  );

  const { collaborator } = await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });
  const { task } = await generateTask({ designStageId: stage.id, ordering: 0 });

  const design2 = await createDesign({
    productType: 'test',
    title: 'design',
    userId: user.id
  });
  const { stage: stage2 } = await generateProductDesignStage(
    { designId: design2.id },
    user.id
  );

  const { task: task2 } = await generateTask({
    createdBy: user.id,
    designStageId: stage2.id,
    ordering: 1
  });
  await CollaboratorTasksDAO.create({
    collaboratorId: collaborator.id,
    taskId: task.id
  });

  const [response, body] = await get(`/tasks?userId=${user.id}`, {
    headers: authHeader(session.id)
  });

  if (body.length === 0) {
    return t.fail('no content');
  }
  t.equal(response.status, 200, 'it should respond with 200');
  t.equal(body.length, 2, 'it should have 2 tasks');
  t.equal(
    body.find((val: DetailsTaskWithAssignees) => task.id === val.id).id,
    task.id,
    'task[0] should match ids'
  );
  t.equal(
    body.find((val: DetailsTaskWithAssignees) => task.id === val.id).assignees
      .length,
    1,
    'task[0] should have 1 assignee'
  );
  t.equal(
    body.find((val: DetailsTaskWithAssignees) => task2.id === val.id).id,
    task2.id,
    'task[1] should match ids'
  );
});

test('POST /tasks creates Task and TaskEvent successfully', async (t: tape.Test) => {
  const { session } = await createUser();

  const [response] = await post('/tasks', {
    body: BASE_TASK_EVENT,
    headers: authHeader(session.id)
  });
  t.equal(response.status, 201);
});

test('PUT /tasks/:taskId creates TaskEvent successfully', async (t: tape.Test) => {
  const { session } = await createUser();

  const { task } = await generateTask();

  const [response] = await put(`/tasks/${task.id}`, {
    body: { ...BASE_TASK_EVENT, id: task.id },
    headers: authHeader(session.id)
  });
  t.equal(response.status, 204);
});

test('PUT /tasks/:taskId/assignees adds Collaborators to Tasks successfully', async (t: tape.Test) => {
  const stubNotification = sandbox()
    .stub(CreateNotifications, 'sendTaskAssignmentNotification')
    .resolves();

  const { session, user } = await createUser();
  const secondUser = await createUser();
  const { task } = await generateTask();
  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'FW19'
  });

  const { collaborator } = await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });
  const { collaborator: secondCollaborator } = await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: secondUser.user.id
  });

  const [responseOne, bodyOne] = await put(`/tasks/${task.id}/assignees`, {
    body: { collaboratorIds: [collaborator.id] },
    headers: authHeader(session.id)
  });
  t.equal(responseOne.status, 200);
  t.equal(bodyOne[0].collaboratorId, collaborator.id);
  t.deepEqual(
    stubNotification.getCall(0).args,
    [task.id, user.id, [collaborator.id]],
    'It sends a notification to collaborators'
  );
  stubNotification.resetHistory();

  const [responseTwo, bodyTwo] = await put(`/tasks/${task.id}/assignees`, {
    body: { collaboratorIds: [collaborator.id, secondCollaborator.id] },
    headers: authHeader(session.id)
  });
  t.equal(responseTwo.status, 200);
  t.equal(bodyTwo[0].collaboratorId, secondCollaborator.id);
  t.equal(bodyTwo[1].collaboratorId, collaborator.id);
  t.deepEqual(
    stubNotification.getCall(0).args,
    [task.id, user.id, [secondCollaborator.id]],
    'It sends a notification to new collaborators'
  );
  stubNotification.resetHistory();

  const [responseThree, bodyThree] = await put(`/tasks/${task.id}/assignees`, {
    body: { collaboratorIds: [secondCollaborator.id] },
    headers: authHeader(session.id)
  });
  t.equal(responseThree.status, 200);
  t.equal(bodyThree[0].collaboratorId, secondCollaborator.id);
  t.equal(
    stubNotification.callCount,
    0,
    'It does not send a notification if no new collaborators were added'
  );
  stubNotification.resetHistory();

  const [responseFour, bodyFour] = await put(`/tasks/${task.id}/assignees`, {
    body: { collaboratorIds: [] },
    headers: authHeader(session.id)
  });
  t.equal(responseFour.status, 200);
  t.equal(bodyFour.length, 0);
  t.equal(
    stubNotification.callCount,
    0,
    'It does not send a notification when unassigning all'
  );
  stubNotification.resetHistory();
});

test('PUT /tasks/:taskId when changing status to Completed', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const secondUser = await createUser();
  const { task } = await generateTask();
  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'FW19'
  });

  const { collaborator } = await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });
  await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: secondUser.user.id
  });
  const event = {
    ...BASE_TASK_EVENT,
    assignees: [collaborator],
    createdBy: user.id,
    designStageId: null,
    id: task.id
  };
  await put(`/tasks/${task.id}`, {
    body: event,
    headers: authHeader(session.id)
  });

  const assignmentNotificationStub = sandbox()
    .stub(CreateNotifications, 'sendTaskAssignmentNotification')
    .resolves();
  await put(`/tasks/${task.id}/assignees`, {
    body: { collaboratorIds: [collaborator.id] },
    headers: authHeader(session.id)
  });

  const completionNotificationStub = sandbox()
    .stub(CreateNotifications, 'sendTaskCompletionNotification')
    .resolves();
  await put(`/tasks/${task.id}`, {
    body: {
      ...event,
      status: TaskStatus.COMPLETED
    },
    headers: authHeader(session.id)
  });

  t.deepEqual(
    completionNotificationStub.getCall(0).args,
    [task.id, user.id],
    'It sends a completion notification'
  );
  t.deepEqual(
    assignmentNotificationStub.getCall(0).args,
    [task.id, user.id, [collaborator.id]],
    'It sends a completion notification'
  );
});

test('POST /tasks/stage/:stageId creates Task on Stage successfully', async (t: tape.Test) => {
  const { session } = await createUser();

  const taskId = uuid.v4();
  const stageId = uuid.v4();
  const stageTaskId = uuid.v4();

  sandbox()
    .stub(TasksDAO, 'create')
    .returns(
      Promise.resolve({
        id: taskId
      })
    );

  sandbox()
    .stub(productDesignStageTasksDAO, 'create')
    .returns(
      Promise.resolve({
        designStageId: stageId,
        id: stageTaskId
      })
    );

  sandbox()
    .stub(TaskEventsDAO, 'create')
    .returns(
      Promise.resolve({
        ...BASE_TASK_EVENT,
        id: taskId,
        designStageId: stageId
      })
    );
  sandbox()
    .stub(TaskEventsDAO, 'findById')
    .returns(
      Promise.resolve({
        ...BASE_TASK_EVENT,
        id: taskId,
        designStageId: stageId
      })
    );

  const [response, body] = await post(`/tasks/stage/${stageId}`, {
    body: BASE_TASK_EVENT,
    headers: authHeader(session.id)
  });
  t.equal(response.status, 201);
  t.equal(body.id, taskId);
  t.equal(body.designStageId, stageId);
});

test('PUT /tasks/:taskId/comment/:id creates a task comment', async (t: tape.Test) => {
  sandbox().useFakeTimers();
  const { session, user } = await createUser();

  const taskId = uuid.v4();
  const announcementStub = sandbox()
    .stub(AnnounceCommentService, 'announceTaskCommentCreation')
    .resolves({});
  const notificationCreateStub = sandbox()
    .stub(CreateNotifications, 'sendTaskCommentCreateNotification')
    .resolves();
  const notificationMentionStub = sandbox()
    .stub(CreateNotifications, 'sendTaskCommentMentionNotification')
    .resolves();
  const attachLinksStub = sandbox()
    .stub(AssetLinkAttachment, 'constructAttachmentAssetLinks')
    .returns({
      downloadLink: 'a-very-download'
    });
  sandbox()
    .stub(CollaboratorsDAO, 'findById')
    .resolves({
      id: 'ac45855a-862a-46cb-8fde-f3643bc3c433',
      user: { name: 'Mr. Yo' }
    });

  const attachment = {
    createdAt: new Date().toISOString(),
    description: null,
    id: uuid.v4(),
    mimeType: 'image/jpeg',
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: '',
    userId: user.id,
    uploadCompletedAt: new Date().toISOString(),
    deletedAt: null
  };

  const addAttachmentLinksStub = sandbox().spy(
    AddAttachmentLinks,
    'addAttachmentLinks'
  );

  await post('/tasks', {
    body: { ...BASE_TASK_EVENT, id: taskId },
    headers: authHeader(session.id)
  });
  const commentBody = {
    createdAt: new Date().toISOString(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    mentions: {},
    parentCommentId: null,
    text: '@<ac45855a-862a-46cb-8fde-f3643bc3c433|collaborator> A comment',
    userEmail: 'cool@me.me',
    userId: 'purposefully incorrect',
    userName: 'Somebody Cool',
    attachments: [attachment]
  };
  const comment = await put(`/tasks/${taskId}/comments/${uuid.v4()}`, {
    body: commentBody,
    headers: authHeader(session.id)
  });
  t.equal(comment[0].status, 201, 'Comment creation succeeds');
  const [response, taskComments] = await get(`/tasks/${taskId}/comments`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200, 'Comment retrieval succeeds');
  t.deepEqual(
    {
      ...taskComments[0],
      attachments: [
        {
          ...taskComments[0].attachments[0],
          createdAt: new Date(taskComments[0].attachments[0].createdAt),
          uploadCompletedAt: new Date(
            taskComments[0].attachments[0].uploadCompletedAt
          )
        }
      ]
    },
    {
      ...commentBody,
      mentions: { 'ac45855a-862a-46cb-8fde-f3643bc3c433': 'Mr. Yo' },
      userEmail: user.email,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      attachments: [
        {
          ...attachment,
          createdAt: new Date(attachment.createdAt),
          uploadCompletedAt: new Date(attachment.uploadCompletedAt),
          downloadLink: 'a-very-download'
        }
      ]
    },
    'Comment retrieval returns the created comment in an array'
  );

  // A notification is sent when comments are made
  t.equal(
    notificationCreateStub.callCount,
    1,
    'Notification is generated from the comment'
  );
  t.equal(
    notificationMentionStub.callCount,
    1,
    'Notification is generated from mention in the comment'
  );
  t.equal(
    announcementStub.callCount,
    1,
    'New task comment is announced to Iris'
  );
  t.equal(addAttachmentLinksStub.callCount, 2, 'Attaches asset links');
  t.equal(
    attachLinksStub.callCount,
    2,
    'Attachment asset links are generated for the created comment'
  );
  t.equal(
    announcementStub.args[0][1].attachments[0].downloadLink,
    'a-very-download',
    'Attachments links are attached to the created comment'
  );
});

test('PUT /tasks/:taskId/comment/:id creates a task threaded comment and notifies the parent', async (t: tape.Test) => {
  sandbox().useFakeTimers();
  const { session, user: user1 } = await createUser();

  const taskId = uuid.v4();
  sandbox()
    .stub(AnnounceCommentService, 'announceTaskCommentCreation')
    .resolves({});
  sandbox()
    .stub(CreateNotifications, 'sendTaskCommentCreateNotification')
    .resolves();
  const notificationReplyStub = sandbox()
    .stub(CreateNotifications, 'sendTaskCommentReplyNotification')
    .resolves();

  const design = await generateDesign({ userId: user1.id });

  const { user: parentUser } = await createUser();

  await generateCollaborator({
    designId: design.id,
    userId: parentUser.id
  });

  const { comment: parentComment } = await generateComment({
    userId: parentUser.id
  });

  const { createdBy: user2 } = await generateComment({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: parentComment.id,
    text: 'Thats a good point..',
    userEmail: 'cool@example.com',
    userName: 'Somebody cool',
    userRole: 'USER' as Role,
    attachments: []
  });

  await generateCollaborator({
    designId: design.id,
    userId: user2.id
  });

  await post('/tasks', {
    body: { ...BASE_TASK_EVENT, id: taskId },
    headers: authHeader(session.id)
  });

  const commentBody = {
    createdAt: new Date().toISOString(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    mentions: {},
    parentCommentId: parentComment.id,
    text: 'A comment',
    userEmail: 'cool@me.me',
    userId: user1.id,
    userName: 'Somebody Cool',
    attachments: []
  };
  await put(`/tasks/${taskId}/comments/${uuid.v4()}`, {
    body: commentBody,
    headers: authHeader(session.id)
  });

  t.equal(
    notificationReplyStub.callCount,
    3,
    'Notifications are created for all thread participants'
  );
  t.deepEqual(
    new Set([
      notificationReplyStub.args[0][1].recipientId,
      notificationReplyStub.args[1][1].recipientId,
      notificationReplyStub.args[2][1].recipientId
    ]),
    new Set([parentUser.id, user1.id, user2.id]),
    'Parent and thread commenters are notified'
  );
});

test('GET list returns all tasks by resource with limit & offset', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'FW19'
  });
  const design = await createDesign({
    productType: 'test',
    title: 'design',
    userId: user.id
  });
  await addDesign(collection.id, design.id);
  const { stage } = await generateProductDesignStage(
    { designId: design.id },
    user.id
  );

  const collaborator = await CollaboratorsDAO.create({
    cancelledAt: null,
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });
  const { task } = await generateTask({ designStageId: stage.id, ordering: 0 });

  const { task: task2 } = await generateTask({
    createdBy: user.id,
    designStageId: stage.id,
    ordering: 1
  });
  await CollaboratorTasksDAO.create({
    collaboratorId: collaborator.id,
    taskId: task.id
  });

  const [response, body] = await get(
    `/tasks?userId=${user.id}&limit=1&offset=1`,
    {
      headers: authHeader(session.id)
    }
  );

  if (body.length === 0) {
    return t.fail('no content');
  }
  t.equal(response.status, 200, 'it should respond with 200');
  t.equal(body.length, 1, 'it should have 1 tasks');
  t.equal(body[0].id, task2.id, 'task[0] should match ids');

  const [response2, body2] = await get(
    `/tasks?collectionId=${collection.id}&limit=1&offset=1`,
    {
      headers: authHeader(session.id)
    }
  );

  if (body2.length === 0) {
    return t.fail('no content');
  }
  t.equal(response2.status, 200, 'it should respond with 200');
  t.equal(body2.length, 1, 'it should have 1 tasks');
  t.equal(body2[0].id, task2.id, 'task[0] should match ids');

  const [response3, body3] = await get(
    `/tasks?stageId=${stage.id}&limit=1&offset=1`,
    {
      headers: authHeader(session.id)
    }
  );

  if (body3.length === 0) {
    return t.fail('no content');
  }
  t.equal(response3.status, 200, 'it should respond with 200');
  t.equal(body3.length, 1, 'it should have 1 tasks');
  t.equal(body3[0].id, task2.id, 'task[0] should match ids');
});
