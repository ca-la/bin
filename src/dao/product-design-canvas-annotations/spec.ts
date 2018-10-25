import * as uuid from 'node-uuid';
import * as tape from 'tape';
import { test } from '../../test-helpers/fresh';
import { create, deleteById, findById, update } from './index';
import createUser = require('../../test-helpers/create-user');
import { create as createDesign } from '../product-designs';
import { create as createDesignCanvas } from '../product-design-canvases';

test('ProductDesignCanvasAnnotation DAO supports creation/retrieval', async (t: tape.Test) => {
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
  const designCanvasAnnotation = await create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    x: 20,
    y: 10
  });

  const result = await findById(designCanvasAnnotation.id);
  t.deepEqual(designCanvasAnnotation, result, 'Returned the inserted annotation');
});

test('ProductDesignCanvasAnnotation DAO supports updating', async (t: tape.Test) => {
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
  const designCanvasAnnotation = await create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    x: 20,
    y: 10
  });
  const data = {
    canvasId: designCanvas.id,
    createdBy: user.id,
    x: 55,
    y: 22
  };
  const updated = await update(designCanvasAnnotation.id, data);
  t.deepEqual(
    updated,
    {
      ...designCanvasAnnotation,
      ...data
    },
    'Succesfully updated the annotation'
  );
});

test('ProductDesignCanvasAnnotation DAO supports deletion', async (t: tape.Test) => {
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
  const designCanvasAnnotation = await create({
    canvasId: designCanvas.id,
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    x: 20,
    y: 10
  });

  const result = await deleteById(designCanvasAnnotation.id);
  t.notEqual(result.deletedAt, null, 'Successfully deleted one row');
  t.equal(await findById(designCanvasAnnotation.id), null, 'Succesfully removed from database');
});
