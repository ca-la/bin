import * as tape from 'tape';
import * as uuid from 'node-uuid';
import * as Knex from 'knex';

import * as db from '../../services/db';
import createUser = require('../../test-helpers/create-user');
import generateCanvas from '../../test-helpers/factories/product-design-canvas';
import { create as createDesign } from '../../components/product-designs/dao';
import { omit } from 'lodash';
import { test } from '../../test-helpers/fresh';
import {
  create,
  deleteById,
  findAllByCanvasId,
  findById,
  getLabel,
  MeasurementNotFoundError,
  update
} from './index';

test('ProductDesignCanvasMeasurement DAO supports creation/retrieval', async (t: tape.Test) => {
  const { user } = await createUser();
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
  const designCanvasMeasurement = await create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    endingX: 20,
    endingY: 10,
    id: uuid.v4(),
    label: 'A',
    measurement: '16 inches',
    name: null,
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
    label: 'B',
    measurement: '6 inches',
    name: 'sleeve length',
    startingX: 1,
    startingY: 1
  });
  const result = await findById(designCanvasMeasurement.id);

  t.deepEqual(
    designCanvasMeasurement,
    result,
    'Returned the inserted measurement'
  );

  const results = await findAllByCanvasId(designCanvas.id);
  t.deepEqual(
    [designCanvasMeasurementTwo, designCanvasMeasurement],
    results,
    'Returned all inserted measurements for the canvas'
  );
});

test('ProductDesignCanvasMeasurementsDAO.create throws error with invalid canvasid', async (t: tape.Test) => {
  const { user } = await createUser();

  const data = {
    canvasId: '60c63643-592c-4280-9d3f-55b934917ca9',
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    endingX: 220,
    endingY: 120,
    id: uuid.v4(),
    label: 'A',
    measurement: '22 inches',
    name: 'sleeve length',
    startingX: 52,
    startingY: 22
  };

  await create(data)
    .then(() => t.fail('Expected error'))
    .catch((err: Error) => {
      t.equal(
        err.message,
        'Invalid canvas ID: 60c63643-592c-4280-9d3f-55b934917ca9'
      );
    });
});

test('MeasurementsDAO.create supports trx statements', async (t: tape.Test) => {
  const { canvas, createdBy } = await generateCanvas({});
  const measurementId = uuid.v4();

  await db
    .transaction(async (trx: Knex.Transaction) => {
      const measurementData = {
        canvasId: canvas.id,
        createdBy: createdBy.id,
        deletedAt: null,
        endingX: 20,
        endingY: 10,
        id: measurementId,
        label: 'A',
        measurement: '16 inches',
        name: null,
        startingX: 5,
        startingY: 2
      };

      const createdMeasurement = await create(measurementData, trx);
      t.deepEqual(
        omit(createdMeasurement, 'createdAt'),
        measurementData,
        'Can successfully create the measurement'
      );
      await trx.rollback(
        new Error('Explicitly roll back the creation statement.')
      );
    })
    .catch((error: any) => {
      t.equals(error.message, 'Explicitly roll back the creation statement.');
    });

  const foundMeasurement = await findById(measurementId);
  t.equal(
    foundMeasurement,
    null,
    'Rolling back a trx does not commit the created measurement'
  );
});

test('ProductDesignCanvasMeasurement DAO supports updating', async (t: tape.Test) => {
  const { user } = await createUser();
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
  const designCanvasMeasurement = await create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    endingX: 20,
    endingY: 10,
    id: uuid.v4(),
    label: 'A',
    measurement: '16 inches',
    name: '',
    startingX: 5,
    startingY: 2
  });
  const data = {
    canvasId: designCanvas.id,
    createdAt: designCanvasMeasurement.createdAt,
    createdBy: user.id,
    deletedAt: null,
    endingX: 220,
    endingY: 120,
    id: designCanvasMeasurement.id,
    label: 'A',
    measurement: '22 inches',
    name: 'sleeve length',
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

test('ProductDesignCanvasMeasurement DAO throws an appopriate error when canvas id is invalid', async (t: tape.Test) => {
  const { user } = await createUser();
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
  const designCanvasMeasurement = await create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    endingX: 20,
    endingY: 10,
    id: uuid.v4(),
    label: 'A',
    measurement: '16 inches',
    name: '',
    startingX: 5,
    startingY: 2
  });
  const data = {
    canvasId: '60c63643-592c-4280-9d3f-55b934917ca9',
    createdAt: designCanvasMeasurement.createdAt,
    createdBy: user.id,
    deletedAt: null,
    endingX: 220,
    endingY: 120,
    id: designCanvasMeasurement.id,
    label: 'A',
    measurement: '22 inches',
    name: 'sleeve length',
    startingX: 52,
    startingY: 22
  };

  await update(designCanvasMeasurement.id, data)
    .then(() => t.fail('Expected error'))
    .catch((err: Error) => {
      t.equal(
        err.message,
        'Invalid canvas ID: 60c63643-592c-4280-9d3f-55b934917ca9'
      );
    });
});

test('ProductDesignCanvasMeasurement DAO supports deletion', async (t: tape.Test) => {
  const { user } = await createUser();
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
  const designCanvasMeasurement = await create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    endingX: 20,
    endingY: 10,
    id: uuid.v4(),
    label: 'A',
    measurement: '16 inches',
    name: 'sleeve length',
    startingX: 5,
    startingY: 2
  });
  const result = await deleteById(designCanvasMeasurement.id);
  t.notEqual(result.deletedAt, null, 'Successfully deleted one row');
  t.equal(
    await findById(designCanvasMeasurement.id),
    null,
    'Succesfully removed from database'
  );
});

// tslint:disable-next-line:max-line-length
test('ProductDesignCanvasMeasurement DAO throws MeasurementNotFoundError when deleting a non-existent measurement', async (t: tape.Test) => {
  try {
    await deleteById('00000000-0000-0000-0000-000000000000');
    t.fail("Shouldn't get here");
  } catch (err) {
    t.ok(err instanceof MeasurementNotFoundError);
    t.equal(err.message, 'Measurement not found');
  }
});

// tslint:disable-next-line:max-line-length
test('ProductDesignCanvasMeasurement DAO throws MeasurementNotFoundError when updating a non-existent measurement', async (t: tape.Test) => {
  try {
    await update('00000000-0000-0000-0000-000000000000', {
      canvasId: '00000000-0000-0000-0000-000000000000',
      createdAt: new Date('2019-01-01'),
      createdBy: '00000000-0000-0000-0000-000000000000',
      deletedAt: null,
      endingX: 20,
      endingY: 10,
      id: '00000000-0000-0000-0000-000000000000',
      label: 'A',
      measurement: '16 inches',
      name: 'sleeve length',
      startingX: 5,
      startingY: 2
    });
    t.fail("Shouldn't get here");
  } catch (err) {
    t.ok(err instanceof MeasurementNotFoundError);
    t.equal(err.message, 'Measurement not found');
  }
});

test('ProductDesignCanvasMeasurement DAO supports getting latest label', async (t: tape.Test) => {
  const { user } = await createUser();
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
  t.equal(await getLabel(designCanvas.id), 'A', 'returns first label');

  const designCanvasMeasurement = await create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    endingX: 20,
    endingY: 10,
    id: uuid.v4(),
    label: 'A',
    measurement: '16 inches',
    name: 'sleeve length',
    startingX: 5,
    startingY: 2
  });
  t.equal(await getLabel(designCanvas.id), 'B', 'returns second label');

  await create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    endingX: 20,
    endingY: 10,
    id: uuid.v4(),
    label: 'A',
    measurement: '9 inches',
    name: 'sleeve width',
    startingX: 5,
    startingY: 2
  });
  t.equal(await getLabel(designCanvas.id), 'C', 'returns third label');

  await deleteById(designCanvasMeasurement.id);
  t.equal(
    await getLabel(designCanvas.id),
    'C',
    'returns third label even after deletion'
  );

  await create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    endingX: 20,
    endingY: 10,
    id: uuid.v4(),
    label: 'A',
    measurement: '4 inches',
    name: 'neck line',
    startingX: 5,
    startingY: 2
  });
  t.equal(
    await getLabel(designCanvas.id),
    'D',
    'continues increment and returns fourth label'
  );
});
