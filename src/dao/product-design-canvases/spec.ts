import * as tape from 'tape';
import { test } from '../../test-helpers/fresh';
import { create, del, findAllByDesignId, findById, update } from './index';
import ProductDesignCanvas from '../../domain-objects/product-design-canvas';
import ProductDesign = require('../../domain-objects/product-design');
import createUser = require('../../test-helpers/create-user');
import { create as createDesign } from '../product-designs';

test('ProductDesignCanvases DAO supports creation/retrieval', async (t: tape.Test) => {
  const userId = await createUser().then((userData: any): string => userData.user.id);
  const designId = await createDesign({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId
  })
  .then((design: ProductDesign) => design.id);

  let canvasId = '';
  const data = {
    createdBy: userId,
    designId,
    height: 2,
    title: 'test',
    width: 2,
    x: 1,
    y: 1
  };
  const inserted = await create(data).then((canvas: ProductDesignCanvas) => {
    canvasId = canvas.id;
    return canvas;
  });

  const result = await findById(canvasId);
  t.deepEqual(result, inserted, 'Returned inserted task');
});

test('ProductDesignCanvases DAO supports update', async (t: tape.Test) => {
  const userId = await createUser().then((userData: any): string => userData.user.id);
  const designId = await createDesign({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId
  })
    .then((design: ProductDesign) => design.id);

  let canvasId = '';
  const data = {
    createdBy: userId,
    designId,
    height: 2,
    title: 'test',
    width: 2,
    x: 1,
    y: 1
  };
  const inserted = await create(data).then((canvas: ProductDesignCanvas) => {
    canvasId = canvas.id;
    return canvas;
  })
  .then((canvas: ProductDesignCanvas) => {
    canvas.title = 'updated';
    return update(canvas.id, canvas);
  });

  const result = await findById(canvasId);
  t.deepEqual(result, inserted, 'Returned inserted canvas');
  t.equal(result.title, 'updated', 'Title was updated');
});

test('ProductDesignCanvases DAO supports delete', async (t: tape.Test) => {
  const userId = await createUser().then((userData: any): string => userData.user.id);
  const designId = await createDesign({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId
  })
    .then((design: ProductDesign) => design.id);

  let canvasId = '';
  const data = {
    createdBy: userId,
    designId,
    height: 2,
    title: 'test',
    width: 2,
    x: 1,
    y: 1
  };
  await create(data).then((canvas: ProductDesignCanvas) => {
    canvasId = canvas.id;
    return canvas;
  })
  .then((canvas: ProductDesignCanvas) => {
    return del(canvas.id);
  });
  const result = await findById(canvasId).catch((e: Error) => {
    if (e.message === 'Cannot read property \'id\' of undefined') {
      return undefined;
    }
    throw e;
  });
  t.equal(result, undefined);
});

test('ProductDesignCanvases DAO supports retrieval by designId', async (t: tape.Test) => {
  const userId = await createUser().then((userData: any): string => userData.user.id);
  const designId = await createDesign({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId
  })
    .then((design: ProductDesign) => design.id);

  const data = {
    createdBy: userId,
    designId,
    height: 2,
    title: 'test',
    width: 2,
    x: 1,
    y: 1
  };
  const inserted = await create(data).then((canvas: ProductDesignCanvas) => {
    return canvas;
  });

  const result = await findAllByDesignId(designId);
  t.deepEqual(result[0], inserted, 'Returned inserted task');
});
