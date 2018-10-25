import * as tape from 'tape';
import { test } from '../../test-helpers/fresh';
import { create, del, findAllByDesignId, findById, update } from './index';
import createUser = require('../../test-helpers/create-user');
import { create as createDesign } from '../product-designs';

test('ProductDesignCanvases DAO supports creation/retrieval', async (t: tape.Test) => {
  const userData = await createUser();
  const userId = userData.user.id;
  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId
  });

  const data = {
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
  t.deepEqual(result, inserted, 'Returned inserted task');
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
    componentId: null,
    createdBy: userId,
    designId: design.id,
    height: 2,
    title: 'test',
    width: 2,
    x: 1,
    y: 1
  };
  const { id, createdAt, deletedAt, ...canvas } = await create(data);
  const inserted = await update(id, { ...canvas, title: 'updated' });

  const result = await findById(inserted.id);
  if (!result) { return t.fail('no result'); }
  t.deepEqual(result, inserted, 'Returned inserted canvas');
  t.equal(result.title, 'updated', 'Title was updated');
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
    componentId: null,
    createdBy: userId,
    designId: design.id,
    height: 2,
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

  const result = await findAllByDesignId(design.id);
  t.deepEqual(result[0], inserted, 'Returned inserted task');
});
