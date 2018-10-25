import * as tape from 'tape';
import { test } from '../../test-helpers/fresh';
import { create, del, findAllByCanvasId, findById, update } from './index';
import { create as createSketch } from '../product-design-images';
import { create as createCanvas } from '../product-design-canvases';
import { ComponentType } from '../../domain-objects/component';
import { create as createDesign } from '../product-designs';
import createUser = require('../../test-helpers/create-user');
import * as uuid from 'node-uuid';

test('Components DAO supports creation/retrieval', async (t: tape.Test) => {
  const userData = await createUser();
  const userId = userData.user.id;
  const id = uuid.v4();
  const sketchId = uuid.v4();
  const sketchData = {
    description: '',
    id: sketchId,
    mimeType: 'image/png',
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: '',
    userId
  };
  const data = {
    artworkId: null,
    createdAt: new Date().toISOString(),
    createdBy: userId,
    deletedAt: new Date().toISOString(),
    id,
    materialId: null,
    parentId: null,
    sketchId,
    type: ComponentType.Sketch
  };
  await createSketch(sketchData);
  const inserted = await create(data);

  const result = await findById(id);
  t.deepEqual(result, inserted, 'Returned inserted component');
});

test('Components DAO supports update', async (t: tape.Test) => {
  const userData = await createUser();
  const userId = userData.user.id;
  const componentId = uuid.v4();
  const sketchId = uuid.v4();
  const sketchData = {
    description: '',
    id: sketchId,
    mimeType: 'image/png',
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: '',
    userId
  };
  const data = {
    artworkId: null,
    createdAt: new Date().toISOString(),
    createdBy: userId,
    deletedAt: new Date().toISOString(),
    id: componentId,
    materialId: null,
    parentId: null,
    sketchId,
    type: ComponentType.Sketch
  };
  await createSketch(sketchData);
  const  { id, createdAt, deletedAt, ...first } = await create(data);
  const inserted = await update(componentId, { ...first, type: ComponentType.Artwork });

  const result = await findById(componentId);
  t.deepEqual(result, inserted, 'Returned inserted component');
  t.equal(result && result.type, ComponentType.Artwork, 'Title was updated');
});

test('Components DAO supports delete', async (t: tape.Test) => {
  const userData = await createUser();
  const userId = userData.user.id;
  const id = uuid.v4();
  const data = {
    artworkId: null,
    createdAt: new Date().toISOString(),
    createdBy: userId,
    deletedAt: new Date().toISOString(),
    id,
    materialId: null,
    parentId: null,
    sketchId: null,
    type: ComponentType.Sketch
  };
  await create(data);
  await del(id);
  const result = await findById(id);
  t.equal(result, null);
});

test('Components DAO supports retrieval by canvasId', async (t: tape.Test) => {
  const userData = await createUser();
  const userId = userData.user.id;
  const id = uuid.v4();
  const sketchId = uuid.v4();
  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId
  });
  const sketchData = {
    description: '',
    id: sketchId,
    mimeType: 'image/png',
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: '',
    userId
  };
  const canvasData = {
    componentId: id,
    createdBy: userId,
    designId: design.id,
    height: 2,
    title: 'test',
    width: 2,
    x: 1,
    y: 1
  };
  const data = {
    artworkId: null,
    createdAt: new Date().toISOString(),
    createdBy: userId,
    deletedAt: new Date().toISOString(),
    id,
    materialId: null,
    parentId: null,
    sketchId,
    type: ComponentType.Sketch
  };
  await createSketch(sketchData);
  const inserted = await create(data);
  const canvas = await createCanvas(canvasData);

  const result = await findAllByCanvasId(canvas.id);
  t.deepEqual(result[0], inserted, 'Returned inserted component');
});