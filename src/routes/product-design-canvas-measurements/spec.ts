import * as tape from 'tape';
import * as uuid from 'node-uuid';
import createUser = require('../../test-helpers/create-user');
import { authHeader, del, get, patch, put } from '../../test-helpers/http';
import { sandbox, test } from '../../test-helpers/fresh';
import * as MeasurementDAO from '../../dao/product-design-canvas-measurements';

test('PUT /:measurementId creates a Measurement', async (t: tape.Test) => {
  const { session, user } = await createUser();

  const measurementId = uuid.v4();
  const canvasId = uuid.v4();
  const data = {
    canvasId,
    createdAt: '',
    createdBy: user.id,
    endingX: 20,
    endingY: 20,
    id: measurementId,
    label: null,
    measurement: '20 inches',
    startingX: 1,
    startingY: 1
  };
  sandbox().stub(MeasurementDAO, 'create').resolves(data);

  const [response, body] = await put(`/product-design-canvas-measurements/${measurementId}`, {
    body: {
      canvasId,
      createdAt: new Date(),
      createdBy: 'me',
      deletedAt: null,
      endingX: 20,
      endingY: 20,
      id: measurementId,
      label: null,
      measurement: '20 inches',
      startingX: 1,
      startingY: 1
    },
    headers: authHeader(session.id)
  });
  t.equal(response.status, 201);
  t.deepEqual(body, data);
});

test('PATCH /:taskId updates a Measurement', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const measurementId = uuid.v4();
  const canvasId = uuid.v4();
  const data = {
    canvasId,
    createdAt: '',
    createdBy: user.id,
    endingX: 23,
    endingY: 23,
    id: measurementId,
    label: null,
    measurement: '20 inches',
    startingX: 1,
    startingY: 1
  };
  sandbox().stub(MeasurementDAO, 'update').resolves(data);
  const [response, body] = await patch(`/product-design-canvas-measurements/${measurementId}`, {
    body: {
      canvasId,
      createdBy: user.id,
      endingX: 23,
      endingY: 23,
      label: null,
      measurement: '20 inches',
      startingX: 1,
      startingY: 1
    },
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.deepEqual(body, data);
});

test('DELETE /:taskId deletes a Measurement', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const measurementId = uuid.v4();
  const canvasId = uuid.v4();
  const data = {
    canvasId,
    createdAt: '',
    createdBy: user.id,
    deletedAt: new Date().toISOString(),
    endingX: 20,
    endingY: 20,
    id: measurementId,
    label: null,
    measurement: '20 inches',
    startingX: 1,
    startingY: 1
  };
  sandbox().stub(MeasurementDAO, 'deleteById').resolves(data);
  const [response] = await del(`/product-design-canvas-measurements/${measurementId}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 204);
});

test('GET /?canvasId=:canvasId returns Measurements', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const canvasId = uuid.v4();

  const data = [{
    canvasId,
    createdBy: user.id,
    endingX: 20,
    endingY: 10,
    id: uuid.v4(),
    label: 'sleeve length',
    measurement: '16 inches',
    startingX: 5,
    startingY: 2

  }, {
    canvasId,
    createdBy: user.id,
    endingX: 2,
    endingY: 10,
    id: uuid.v4(),
    label: 'sleeve width',
    measurement: '6 inches',
    startingX: 1,
    startingY: 1
  }];

  sandbox().stub(MeasurementDAO, 'findAllByCanvasId').resolves(data);

  const [response, body] = await get(`/product-design-canvas-measurements/?canvasId=${canvasId}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.deepEqual(body, data);
});
