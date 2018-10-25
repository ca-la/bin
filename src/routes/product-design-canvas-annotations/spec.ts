import * as tape from 'tape';
import * as uuid from 'node-uuid';
import createUser = require('../../test-helpers/create-user');
import { authHeader, del, get, patch, put } from '../../test-helpers/http';
import { sandbox, test } from '../../test-helpers/fresh';
import * as AnnotationDAO from '../../dao/product-design-canvas-annotations';
import { create as createDesign } from '../../dao/product-designs';
import { create as createDesignCanvas } from '../../dao/product-design-canvases';

const API_PATH = '/product-design-canvas-annotations';

test(`PUT ${API_PATH}/:annotationId creates an Annotation`, async (t: tape.Test) => {
  const { session, user } = await createUser();

  const annotationId = uuid.v4();
  const canvasId = uuid.v4();
  const data = {
    canvasId,
    createdAt: '',
    createdBy: user.id,
    id: annotationId,
    x: 1,
    y: 1
  };
  sandbox().stub(AnnotationDAO, 'create').resolves(data);

  const [response, body] = await put(`${API_PATH}/${annotationId}`, {
    body: {
      canvasId,
      createdAt: new Date(),
      createdBy: 'me',
      deletedAt: null,
      id: annotationId,
      x: 1,
      y: 1
    },
    headers: authHeader(session.id)
  });
  t.equal(response.status, 201);
  t.deepEqual(body, data);
});

test(`PATCH ${API_PATH}/:annotationId updates an Annotation`, async (t: tape.Test) => {
  const { session, user } = await createUser();
  const annotationId = uuid.v4();
  const canvasId = uuid.v4();
  const data = {
    canvasId,
    createdAt: '',
    createdBy: user.id,
    id: annotationId,
    x: 1,
    y: 1
  };
  sandbox().stub(AnnotationDAO, 'update').resolves(data);
  const [response, body] = await patch(`${API_PATH}/${annotationId}`, {
    body: {
      canvasId,
      x: 1,
      y: 1
    },
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.deepEqual(body, data);
});

test(`DELETE ${API_PATH}/:annotationId deletes an Annotation`, async (t: tape.Test) => {
  const { session, user } = await createUser();
  const annotationId = uuid.v4();
  const canvasId = uuid.v4();
  const data = {
    canvasId,
    createdAt: '',
    createdBy: user.id,
    deletedAt: new Date().toISOString(),
    id: annotationId,
    x: 1,
    y: 1
  };
  sandbox().stub(AnnotationDAO, 'deleteById').resolves(data);
  const [response] = await del(`${API_PATH}/${annotationId}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 204);
});

test(`GET ${API_PATH}/?canvasId=:canvasId returns Annotations`, async (t: tape.Test) => {
  const { session, user } = await createUser();
  const canvasId = uuid.v4();

  const data = [{
    canvasId,
    createdBy: user.id,
    id: uuid.v4(),
    x: 5,
    y: 2
  }, {
    canvasId,
    createdBy: user.id,
    id: uuid.v4(),
    x: 1,
    y: 1
  }];

  sandbox().stub(AnnotationDAO, 'findAllByCanvasId').resolves(data);

  const [response, body] = await get(`${API_PATH}/?canvasId=${canvasId}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.deepEqual(body, data);
});

test(
  `PUT ${API_PATH}/:annotationId/comment/:commentId creates a comment`,
  async (t: tape.Test) => {
    const { session, user } = await createUser();

    const annotationId = uuid.v4();
    const commentId = uuid.v4();

    const design = await createDesign({
      productType: 'TEESHIRT',
      title: 'Green Tee',
      userId: user.id
    });
    const designCanvas = await createDesignCanvas({
      componentId: null,
      createdBy: user.id,
      designId: design.id,
      height: 200,
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

    const commentBody = {
      createdAt: new Date().toISOString(),
      deletedAt: null,
      id: commentId,
      isPinned: false,
      parentCommentId: null,
      text: 'A comment',
      userId: 'purposefully incorrect'
    };

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

    const annotationCommentResponse = await get(
      `${API_PATH}/${annotationResponse[1].id}/comments`,
      { headers: authHeader(session.id) }
    );
    t.equal(annotationCommentResponse[0].status, 200, 'Comment retrieval succeeds');
    t.deepEqual(
      annotationCommentResponse[1],
      [{
        ...commentBody,
        userId: user.id
      }],
      'Comment retrieval returns the created comment in an array'
    );
  }
);
