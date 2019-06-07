import * as tape from 'tape';
import { test } from '../../test-helpers/fresh';
import {
  create,
  del,
  findAllByDesignId,
  findByComponentId,
  findById,
  reorder,
  update
} from './dao';
import createUser = require('../../test-helpers/create-user');
import { create as createDesign } from '../../dao/product-designs';
import generateCanvas from '../../test-helpers/factories/product-design-canvas';

test('ProductDesignCanvases DAO supports creation/retrieval', async (t: tape.Test) => {
  const userData = await createUser();
  const userId = userData.user.id;
  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId
  });

  const data = {
    archivedAt: null,
    componentId: null,
    createdBy: userId,
    designId: design.id,
    height: 2,
    ordering: 0,
    title: 'test',
    width: 2,
    x: 1,
    y: 1
  };
  const inserted = await create(data);
  const result = await findById(inserted.id);
  t.deepEqual(result, inserted, 'Returned inserted task');
});

test('ProductDesignCanvases DAO supports creation/retrieval without ordering', async (t: tape.Test) => {
  const userData = await createUser();
  const userId = userData.user.id;
  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId
  });

  const data = {
    archivedAt: null,
    componentId: null,
    createdBy: userId,
    designId: design.id,
    height: 2,
    title: 'test',
    width: 2,
    x: 1,
    y: 1
  };
  const inserted = await create(data);

  const result = await findById(inserted.id);
  t.deepEqual(result, { ...inserted, ordering: 0 }, 'Returned inserted task');
});

test('ProductDesignCanvases DAO supports update', async (t: tape.Test) => {
  const userData = await createUser();
  const userId = userData.user.id;
  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId
  });

  const data = {
    archivedAt: null,
    componentId: null,
    createdBy: userId,
    designId: design.id,
    height: 2,
    ordering: 0,
    title: 'test',
    width: 2,
    x: 1,
    y: 1
  };
  const { id, createdAt, deletedAt, ...canvas } = await create(data);
  const inserted = await update(id, {
    ...canvas,
    title: 'updated',
    archivedAt: new Date('2019-01-01')
  });

  const result = await findById(inserted.id);
  if (!result) {
    return t.fail('no result');
  }
  t.deepEqual(result, inserted, 'Returned inserted canvas');
  t.equal(result.title, 'updated', 'Title was updated');
  if (!inserted.archivedAt) {
    return t.fail('expected an archivedAt date!');
  }
  t.deepEqual(
    new Date(inserted.archivedAt),
    new Date('2019-01-01'),
    'Returns the same date'
  );
});

test('ProductDesignCanvases DAO supports reorder', async (t: tape.Test) => {
  const userData = await createUser();
  const userId = userData.user.id;
  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId
  });

  const data = {
    archivedAt: null,
    componentId: null,
    createdBy: userId,
    designId: design.id,
    height: 2,
    ordering: 0,
    title: 'test',
    width: 2,
    x: 1,
    y: 1
  };
  const data2 = {
    archivedAt: null,
    componentId: null,
    createdBy: userId,
    designId: design.id,
    height: 2,
    ordering: 1,
    title: 'test',
    width: 2,
    x: 1,
    y: 1
  };
  const canvas = await create(data);
  const canvas2 = await create(data2);
  const inserted = await reorder([
    { id: canvas2.id, ordering: 0 },
    { id: canvas.id, ordering: 1 }
  ]);

  const result = await findAllByDesignId(design.id);
  if (!result) {
    return t.fail('no result');
  }
  t.deepEqual(result, inserted, 'Returned inserted canvases');
  t.deepEqual(result[1].id, canvas.id, 'First canvas is correct');
  t.equal(result[1].ordering, 1, 'Canvas has new ordering');
});

test('ProductDesignCanvases DAO supports delete', async (t: tape.Test) => {
  const userData = await createUser();
  const userId = userData.user.id;
  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId
  });

  const data = {
    archivedAt: null,
    componentId: null,
    createdBy: userId,
    designId: design.id,
    height: 2,
    ordering: 0,
    title: 'test',
    width: 2,
    x: 1,
    y: 1
  };
  const canvas = await create(data);
  await del(canvas.id);

  const result = await findById(canvas.id);
  t.equal(result, null);
});

test('ProductDesignCanvases DAO supports retrieval by designId', async (t: tape.Test) => {
  const userData = await createUser();
  const userId = userData.user.id;
  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId
  });

  const data = {
    archivedAt: null,
    componentId: null,
    createdBy: userId,
    designId: design.id,
    height: 2,
    ordering: 0,
    title: 'test',
    width: 2,
    x: 1,
    y: 1
  };
  const inserted = await create(data);

  const result = await findAllByDesignId(design.id);
  t.deepEqual(result[0], inserted, 'Returned inserted task');
});

test('ProductDesignCanvases DAO supports retrieval by componentId', async (t: tape.Test) => {
  const { canvas, component } = await generateCanvas({});
  const foundCanvas = await findByComponentId(component.id);
  t.deepEqual(
    canvas,
    foundCanvas,
    'Returns the canvas associated with the given component'
  );
});
