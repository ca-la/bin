import tape from 'tape';
import uuid from 'node-uuid';
import createUser from '../../test-helpers/create-user';
import { authHeader, del, get, post, put } from '../../test-helpers/http';
import { sandbox, test } from '../../test-helpers/fresh';
import * as CreateNotifications from '../../services/create-notifications';
import * as AnnotationCommentsDAO from '../../components/annotation-comments/dao';
import * as AnnounceTaskCommentService from '../../components/iris/messages/task-comment';
import * as AnnounceApprovalStepCommentService from '../../components/iris/messages/approval-step-comment';
import generateComment from '../../test-helpers/factories/comment';
import generateApprovalStep from '../../test-helpers/factories/design-approval-step';
import db from '../../services/db';
import Knex from 'knex';

test('DELETE /comment/:id deletes a task comment', async (t: tape.Test) => {
  const { session, user } = await createUser();

  sandbox()
    .stub(CreateNotifications, 'sendTaskCommentCreateNotification')
    .resolves();
  sandbox()
    .stub(AnnounceTaskCommentService, 'announceTaskCommentCreation')
    .resolves({});
  const announceDeleteStub = sandbox()
    .stub(AnnounceTaskCommentService, 'announceTaskCommentDeletion')
    .resolves({});

  const task = await post('/tasks', {
    body: {
      assignees: [],
      collection: {
        id: uuid.v4(),
        title: 'test'
      },
      commentCount: 0,
      createdAt: new Date().toISOString(),
      createdBy: 'purposefully incorrect',
      description: 'Description',
      design: {
        id: uuid.v4(),
        title: 'test'
      },
      designStage: {
        id: uuid.v4(),
        title: 'test'
      },
      designStageId: null,
      dueDate: null,
      id: uuid.v4(),
      ordering: 0,
      status: null,
      title: 'Title'
    },
    headers: authHeader(session.id)
  });
  const commentBody = {
    createdAt: new Date().toISOString(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    mentions: {},
    parentCommentId: null,
    text: 'A comment',
    userEmail: 'cool@me.me',
    userId: 'purposefully incorrect',
    userName: 'Somebody Cool',
    attachments: []
  };
  const comment = await put(`/tasks/${task[1].taskId}/comments/${uuid.v4()}`, {
    body: commentBody,
    headers: authHeader(session.id)
  });
  const withComment = await get(`/tasks/${task[1].taskId}/comments`, {
    headers: authHeader(session.id)
  });

  t.deepEqual(
    withComment[1],
    [
      {
        ...commentBody,
        mentions: {},
        userEmail: user.email,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        attachments: []
      }
    ],
    'Comment retrieval returns the created comment in an array'
  );
  const deleteRequest = await del(
    `/comments/${comment[1].id}?taskId=${task[1].taskId}`,
    { headers: authHeader(session.id) }
  );
  t.equal(deleteRequest[0].status, 204, 'Comment deletion succeeds');
  t.true(announceDeleteStub.calledOnce);

  const withoutComment = await get(`/tasks/${task[1].taskId}/comments`, {
    headers: authHeader(session.id)
  });

  t.equal(withoutComment[0].status, 200, 'Comment retrieval succeeds');
  t.deepEqual(
    withoutComment[1],
    [],
    'Comment retrieval does not include deleted comment'
  );
});

test('GET /comments/?annotationIds= returns comments by annotation', async (t: tape.Test) => {
  const { session } = await createUser();

  const idOne = uuid.v4();
  const idTwo = uuid.v4();
  const idThree = uuid.v4();

  const daoStub = sandbox()
    .stub(AnnotationCommentsDAO, 'findByAnnotationIds')
    .callsFake(
      async (annotationIds: string[]): Promise<string[]> => {
        return annotationIds;
      }
    );

  const [response, body] = await get(
    `/comments?annotationIds=${idOne}&annotationIds=${idTwo}&annotationIds=${idThree}`,
    { headers: authHeader(session.id) }
  );

  t.equal(response.status, 200, 'Successfully returns');
  t.equal(body.length, 3, 'Stub returns the list of annotation ids');
  t.equal(daoStub.callCount, 1, 'Stub is called exactly once');
  t.deepEqual(
    daoStub.args[0][0],
    [idOne, idTwo, idThree],
    'Calls DAO with correct annotation IDs'
  );
});

test('GET /comments/?annotationIds= returns comments by annotation even with one id', async (t: tape.Test) => {
  const { session } = await createUser();
  const idOne = uuid.v4();
  const daoStub = sandbox()
    .stub(AnnotationCommentsDAO, 'findByAnnotationIds')
    .callsFake(
      async (annotationIds: string[]): Promise<string[]> => {
        return annotationIds;
      }
    );

  const [response, body] = await get(`/comments?annotationIds=${idOne}`, {
    headers: authHeader(session.id)
  });

  t.equal(response.status, 200, 'Successfully returns a 200');
  t.equal(body.length, 1, 'Stub returns the list');
  t.equal(daoStub.callCount, 1, 'Stub is called exactly once');
  t.deepEqual(
    daoStub.args[0][0],
    [idOne],
    'Calls DAO with a one element array'
  );
});

test('GET /comments/?annotationIds= returns comments by annotation even with one id', async (t: tape.Test) => {
  const { session } = await createUser();
  const daoStub = sandbox()
    .stub(AnnotationCommentsDAO, 'findByAnnotationIds')
    .callsFake(
      async (annotationIds: string[]): Promise<string[]> => {
        return annotationIds;
      }
    );

  const [response, body] = await get('/comments', {
    headers: authHeader(session.id)
  });

  t.equal(response.status, 400, 'Throws an error');
  t.equal(body.message, 'Missing annotationIds!');
  t.equal(daoStub.callCount, 0, 'Stub is never called');
});

test('DELETE /comment/:id deletes a approval step comment', async (t: tape.Test) => {
  const { session, user } = await createUser();

  const { comment } = await generateComment({ userId: user.id });
  const { approvalStep } = await db.transaction((trx: Knex.Transaction) =>
    generateApprovalStep(trx)
  );

  const announceDeleteStub = sandbox()
    .stub(
      AnnounceApprovalStepCommentService,
      'announceApprovalStepCommentDeletion'
    )
    .resolves({});

  const deleteRequest = await del(
    `/comments/${comment.id}?approvalStepId=${approvalStep.id}`,
    { headers: authHeader(session.id) }
  );
  t.equal(deleteRequest[0].status, 204, 'Comment deletion succeeds');
  t.true(announceDeleteStub.calledOnce);
});
