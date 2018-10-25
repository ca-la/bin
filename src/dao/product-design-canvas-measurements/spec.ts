import * as tape from 'tape';
import * as uuid from 'node-uuid';
import { test } from '../../test-helpers/fresh';
import { create, deleteById, findAllByCanvasId, findById, update } from './index';
import createUser = require('../../test-helpers/create-user');
import { create as createDesign } from '../product-designs';
import { create as createDesignCanvas } from '../product-design-canvases';

test('ProductDesignCanvasMeasurement DAO supports creation/retrieval', async (t: tape.Test) => {
  const { user } = await createUser();
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
  const designCanvasMeasurement = await create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    endingX: 20,
    endingY: 10,
    id: uuid.v4(),
    label: 'sleeve length',
    measurement: '16 inches',
    startingX: 5,
    startingY: 2
  });
  const designCanvasMeasurementTwo = await create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    endingX: 2,
    endingY: 10,
    id: uuid.v4(),
    label: 'sleeve width',
    measurement: '6 inches',
    startingX: 1,
    startingY: 1
  });
  const result = await findById(designCanvasMeasurement.id);

  t.deepEqual(designCanvasMeasurement, result, 'Returned the inserted measurement');

  const results = await findAllByCanvasId(designCanvas.id);
  t.deepEqual(
    [designCanvasMeasurement, designCanvasMeasurementTwo],
    results,
    'Returned all inserted measurements for the canvas'
  );
});

test('ProductDesignCanvasMeasurement DAO supports updating', async (t: tape.Test) => {
  const { user } = await createUser();
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
  const designCanvasMeasurement = await create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    endingX: 20,
    endingY: 10,
    id: uuid.v4(),
    label: 'sleeve length',
    measurement: '16 inches',
    startingX: 5,
    startingY: 2
  });
  const data = {
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    endingX: 220,
    endingY: 120,
    id: designCanvasMeasurement.id,
    label: 'sleeve length',
    measurement: '22 inches',
    startingX: 52,
    startingY: 22
  };
  const result = await update(designCanvasMeasurement.id, data);
  t.deepEqual(
    result,
    {
      ...data,
      createdAt: designCanvasMeasurement.createdAt,
      deletedAt: null,
      id: designCanvasMeasurement.id
    },
    'Succesfully updated the measurement'
  );
});

test('ProductDesignCanvasMeasurement DAO supports deletion', async (t: tape.Test) => {
  const { user } = await createUser();
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
  const designCanvasMeasurement = await create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    endingX: 20,
    endingY: 10,
    id: uuid.v4(),
    label: 'sleeve length',
    measurement: '16 inches',
    startingX: 5,
    startingY: 2
  });
  const result = await deleteById(designCanvasMeasurement.id);
  t.notEqual(result.deletedAt, null, 'Successfully deleted one row');
  t.equal(await findById(designCanvasMeasurement.id), null, 'Succesfully removed from database');
});
