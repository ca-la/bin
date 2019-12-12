import uuid from 'node-uuid';

import createUser from '../../test-helpers/create-user';
import { authHeader, get, put } from '../../test-helpers/http';
import { sandbox, test, Test } from '../../test-helpers/fresh';
import { create as createDesign } from '../product-designs/dao';
import * as CreateNotifications from '../../services/create-notifications';
import generateCollaborator from '../../test-helpers/factories/collaborator';
import generateCollection from '../../test-helpers/factories/collection';
import * as AnnounceCommentService from '../iris/messages/annotation-comment';
import generateCanvas from '../../test-helpers/factories/product-design-canvas';
import { addDesign } from '../../test-helpers/collections';

const API_PATH = '/product-design-canvas-annotations';

test(`PUT ${API_PATH}/:annotationId/comment/:commentId creates a comment`, async (t: Test) => {
  const announcementStub = sandbox()
    .stub(AnnounceCommentService, 'announceAnnotationCommentCreation')
    .resolves({});
  const { session, user } = await createUser();

  const annotationId = uuid.v4();
  const commentId = uuid.v4();
  const commentWithMentionId = uuid.v4();

  const { collection } = await generateCollection({ createdBy: user.id });
  const { collaborator } = await generateCollaborator({
    collectionId: collection.id,
    userId: user.id
  });

  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Green Tee',
    userId: user.id
  });
  await addDesign(collection.id, design.id);

  const { canvas: designCanvas } = await generateCanvas({
    componentId: null,
    createdBy: user.id,
    designId: design.id,
    height: 200,
    ordering: 0,
    title: 'My Green Tee',
    width: 200,
    x: 0,
    y: 0
  });
  const annotationData = {
    canvasId: designCanvas.id,
    createdAt: new Date(),
    createdBy: 'me',
    deletedAt: null,
    id: annotationId,
    x: 1,
    y: 1
  };
  const date1 = new Date();
  const date2 = new Date(date1.getTime() + 1000);

  const commentBody = {
    createdAt: date1.toISOString(),
    deletedAt: null,
    id: commentId,
    isPinned: false,
    mentions: {},
    parentCommentId: null,
    text: 'A comment',
    userEmail: 'cool@me.me',
    userId: 'purposefully incorrect',
    userName: 'Somebody cool'
  };

  const commentWithMentionBody = {
    createdAt: date2.toISOString(),
    deletedAt: null,
    id: commentWithMentionId,
    isPinned: false,
    mentions: {
      [collaborator.id]: user.name
    },
    parentCommentId: null,
    text: `A comment @<${collaborator.id}|collaborator>`,
    userEmail: 'cool@me.me',
    userId: 'purposefully incorrect',
    userName: 'Somebody cool'
  };

  const notificationStub = sandbox()
    .stub(
      CreateNotifications,
      'sendDesignOwnerAnnotationCommentCreateNotification'
    )
    .resolves();

  const notificationMentionStub = sandbox()
    .stub(CreateNotifications, 'sendAnnotationCommentMentionNotification')
    .resolves();

  const annotationResponse = await put(`${API_PATH}/${annotationId}`, {
    body: annotationData,
    headers: authHeader(session.id)
  });
  const commentResponse = await put(
    `${API_PATH}/${annotationResponse[1].id}/comments/${commentId}`,
    {
      body: commentBody,
      headers: authHeader(session.id)
    }
  );
  t.equal(commentResponse[0].status, 201, 'Comment creation succeeds');
  t.equal(
    notificationMentionStub.callCount,
    0,
    'Mentions notification not called'
  );
  t.equal(notificationStub.callCount, 1, 'Comment notification called');
  t.equal(announcementStub.callCount, 1, 'Announces the new comment to Iris');

  const annotationCommentResponse = await get(
    `${API_PATH}/${annotationResponse[1].id}/comments`,
    { headers: authHeader(session.id) }
  );
  t.equal(
    annotationCommentResponse[0].status,
    200,
    'Comment retrieval succeeds'
  );
  t.deepEqual(
    annotationCommentResponse[1],
    [
      {
        ...commentBody,
        annotationId: annotationResponse[1].id,
        mentions: {},
        userEmail: user.email,
        userId: user.id,
        userName: user.name,
        userRole: user.role
      }
    ],
    'Comment retrieval returns the created comment in an array'
  );

  t.deepEqual(notificationStub.getCall(0).args, [
    annotationResponse[1].id,
    annotationResponse[1].canvasId,
    commentBody.id,
    user.id,
    []
  ]);

  await put(
    `${API_PATH}/${annotationResponse[1].id}/comments/${commentWithMentionId}`,
    {
      body: commentWithMentionBody,
      headers: authHeader(session.id)
    }
  );
  t.equal(notificationMentionStub.callCount, 1, 'Mentions notification called');
  t.equal(notificationStub.callCount, 2, 'Comment notification called');
  t.deepEqual(notificationStub.getCall(1).args, [
    annotationResponse[1].id,
    annotationResponse[1].canvasId,
    commentWithMentionId,
    user.id,
    [collaborator.user!.id]
  ]);
  t.equal(announcementStub.callCount, 2, 'Announces the comment to Iris');

  notificationStub.rejects(new Error('Notification creation failure'));

  const notMadeComment = { ...commentBody, id: uuid.v4() };
  const commentNotificationFailure = await put(
    `${API_PATH}/${annotationResponse[1].id}/comments/${commentId}`,
    {
      body: notMadeComment,
      headers: authHeader(session.id)
    }
  );
  t.equal(commentNotificationFailure[0].status, 500, 'Comment creation fails');

  t.equal(
    notificationMentionStub.callCount,
    1,
    'Mentions notification not called'
  );
  t.equal(notificationStub.callCount, 3, 'Comment notification called');
  t.deepEqual(notificationStub.getCall(2).args, [
    annotationResponse[1].id,
    annotationResponse[1].canvasId,
    notMadeComment.id,
    user.id,
    []
  ]);
  t.equal(announcementStub.callCount, 3, 'Announces the comment to Iris');

  const [response, body] = await get(
    `${API_PATH}/${annotationResponse[1].id}/comments`,
    { headers: authHeader(session.id) }
  );
  t.equal(response.status, 200);
  t.equal(body.length, 2);
  t.deepEqual(
    body,
    [
      {
        ...commentBody,
        annotationId: annotationResponse[1].id,
        mentions: {},
        userEmail: user.email,
        userId: user.id,
        userName: user.name,
        userRole: user.role
      },
      {
        ...commentWithMentionBody,
        annotationId: annotationResponse[1].id,
        userEmail: user.email,
        userId: user.id,
        userName: user.name,
        userRole: user.role
      }
    ],
    'Comment retrieval returns all the comments for the annotation'
  );
});
