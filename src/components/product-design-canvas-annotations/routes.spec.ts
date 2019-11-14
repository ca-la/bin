import uuid from 'node-uuid';

import ResourceNotFoundError from '../../errors/resource-not-found';
import createUser = require('../../test-helpers/create-user');
import { authHeader, del, get, patch, put } from '../../test-helpers/http';
import { sandbox, test, Test } from '../../test-helpers/fresh';
import * as AnnotationDAO from './dao';
import { create as createDesign } from '../product-designs/dao';
import generateCanvas from '../../test-helpers/factories/product-design-canvas';

const API_PATH = '/product-design-canvas-annotations';

test(`PUT ${API_PATH}/:annotationId creates an Annotation`, async (t: Test) => {
  const { session, user } = await createUser();

  const annotationId = uuid.v4();

  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Green Tee',
    userId: user.id
  });
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
  const data = {
    canvasId: designCanvas.id,
    createdAt: new Date().toISOString(),
    createdBy: user.id,
    deletedAt: null,
    id: annotationId,
    x: 1,
    y: 1
  };

  const [response, body] = await put(`${API_PATH}/${annotationId}`, {
    body: data,
    headers: authHeader(session.id)
  });
  t.equal(response.status, 201);
  t.deepEqual(body, data);
});

test(`PATCH ${API_PATH}/:annotationId updates an Annotation`, async (t: Test) => {
  const { session, user } = await createUser();
  const annotationId = uuid.v4();

  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Green Tee',
    userId: user.id
  });
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
  const annotation = await AnnotationDAO.create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    id: annotationId,
    x: 1,
    y: 1
  });
  const data = {
    canvasId: designCanvas.id,
    createdAt: 'something completely invalid',
    createdBy: 'not a user id.',
    deletedAt: 'also really invalid',
    id: annotation.id,
    x: 33,
    y: 10
  };

  const [response, body] = await patch(`${API_PATH}/${annotationId}`, {
    body: data,
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.deepEqual(body, {
    ...data,
    createdAt: annotation.createdAt.toISOString(),
    createdBy: annotation.createdBy,
    deletedAt: annotation.deletedAt
  });
});

test(`DELETE ${API_PATH}/:annotationId deletes an Annotation`, async (t: Test) => {
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
  const deleteStub = sandbox()
    .stub(AnnotationDAO, 'deleteById')
    .resolves(data);
  const [response] = await del(`${API_PATH}/${annotationId}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 204);

  deleteStub.rejects(new ResourceNotFoundError('Annotation not found'));

  const [invalidResponse] = await del(`${API_PATH}/do-not-find-me`, {
    headers: authHeader(session.id)
  });
  t.equal(invalidResponse.status, 404);

  deleteStub.rejects(new Error('Some other error'));

  const [unknownErrorResponse] = await del(`${API_PATH}/do-not-find-me`, {
    headers: authHeader(session.id)
  });
  t.equal(unknownErrorResponse.status, 500);
});

test(`GET ${API_PATH}/?canvasId=:canvasId returns Annotations`, async (t: Test) => {
  const { session, user } = await createUser();
  const canvasId = uuid.v4();

  const data = [
    {
      canvasId,
      createdBy: user.id,
      id: uuid.v4(),
      x: 5,
      y: 2
    },
    {
      canvasId,
      createdBy: user.id,
      id: uuid.v4(),
      x: 1,
      y: 1
    }
  ];

  sandbox()
    .stub(AnnotationDAO, 'findAllByCanvasId')
    .resolves(data);
  sandbox()
    .stub(AnnotationDAO, 'findAllWithCommentsByCanvasId')
    .resolves([data[1]]);

  const [response, body] = await get(`${API_PATH}/?canvasId=${canvasId}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.deepEqual(body, data);

  const [withCommentsResponse, withComments] = await get(
    `${API_PATH}?canvasId=${canvasId}&hasComments=true`,
    { headers: authHeader(session.id) }
  );
  t.equal(withCommentsResponse.status, 200);
  t.deepEqual(withComments, [data[1]]);
});

test(`GET ${API_PATH}/ without a canvasId fails`, async (t: Test) => {
  const { session } = await createUser();
  const [response] = await get(`${API_PATH}/`, {
    headers: authHeader(session.id)
  });

  t.equal(response.status, 400);
});
