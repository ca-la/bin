import * as tape from 'tape';
import * as uuid from 'node-uuid';
import createUser = require('../../test-helpers/create-user');
import { authHeader, del, get, patch, put } from '../../test-helpers/http';
import { sandbox, test } from '../../test-helpers/fresh';
import * as MeasurementDAO from '../../dao/product-design-canvas-measurements';
import { create as createDesign } from '../../dao/product-designs';
import { create as createDesignCanvas } from '../../dao/product-design-canvases';

test('PUT /:measurementId creates a Measurement', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const measurementId = uuid.v4();

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
  const data = {
    canvasId: designCanvas.id,
    createdAt: new Date().toISOString(),
    createdBy: user.id,
    deletedAt: null,
    endingX: 20,
    endingY: 20,
    id: measurementId,
    label: null,
    measurement: '20 inches',
    startingX: 1,
    startingY: 1
  };

  const [response, body] = await put(`/product-design-canvas-measurements/${measurementId}`, {
    body: data,
    headers: authHeader(session.id)
  });
  t.equal(response.status, 201);
  t.deepEqual(body, data);
});

test('PATCH /:taskId updates a Measurement', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const measurementId = uuid.v4();

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
  const measurement = await MeasurementDAO.create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    endingX: 20,
    endingY: 20,
    id: measurementId,
    label: null,
    measurement: '20 inches',
    startingX: 1,
    startingY: 1
  });

  const data = {
    canvasId: designCanvas.id,
    createdAt: measurement.createdAt.toISOString(),
    createdBy: user.id,
    deletedAt: null,
    endingX: 23,
    endingY: 23,
    id: measurementId,
    label: null,
    measurement: '22 inches',
    startingX: 1,
    startingY: 1
  };
  const [response, body] = await patch(`/product-design-canvas-measurements/${measurementId}`, {
    body: data,
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
