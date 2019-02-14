import * as tape from 'tape';
import * as uuid from 'node-uuid';
import * as Knex from 'knex';
import { omit } from 'lodash';

import * as db from '../../services/db';
import { test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import generateMeasurement from '../../test-helpers/factories/product-design-canvas-measurement';

import { ComponentType } from '../../domain-objects/component';
import Measurement from '../../domain-objects/product-design-canvas-measurement';

import { create as createOption } from '../../dao/product-design-options';
import { create as createComponent } from '../../dao/components';
import { create as createImage } from '../../components/images/dao';

import {
  findAndDuplicateComponent,
  findAndDuplicateMeasurements,
  findAndDuplicateOption
} from './index';

test('findAndDuplicateOption without sub-resources', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const optionId = uuid.v4();
  const optionData = {
    id: optionId,
    title: 'some_random_title',
    type: 'FABRIC',
    userId: user.id
  };
  await createOption(optionData);

  await db.transaction(async (trx: Knex.Transaction) => {
    const duplicatedOption = await findAndDuplicateOption(optionId, trx);
    t.deepEqual(
      {
        id: duplicatedOption.id,
        title: duplicatedOption.title,
        type: duplicatedOption.type,
        userId: duplicatedOption.userId
      },
      {
        ...optionData,
        id: duplicatedOption.id
      },
      'Duplicating an option returns the same option but with a new id'
    );
  });
});

test('findAndDuplicateOption with sub-resources', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const imageId = uuid.v4();
  const imageData = {
    description: '',
    id: imageId,
    mimeType: 'image/png',
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: '',
    userId: user.id
  };
  await createImage(imageData);

  const optionId = uuid.v4();
  const optionData = {
    id: optionId,
    previewImageId: imageId,
    title: 'some_random_title',
    type: 'FABRIC',
    userId: user.id
  };
  await createOption(optionData);

  await db.transaction(async (trx: Knex.Transaction) => {
    const duplicatedOption = await findAndDuplicateOption(optionId, trx);
    t.deepEqual(
      {
        id: duplicatedOption.id,
        previewImageId: duplicatedOption.previewImageId,
        title: duplicatedOption.title,
        type: duplicatedOption.type,
        userId: duplicatedOption.userId
      },
      {
        ...optionData,
        id: duplicatedOption.id,
        previewImageId: imageId
      },
      'Duplicating an option returns the same option but with a new id'
    );
  });
});

test('findAndDuplicateComponent without sub-resources', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const componentId = uuid.v4();
  const componentData = {
    artworkId: null,
    createdBy: user.id,
    id: componentId,
    materialId: null,
    parentId: null,
    sketchId: null,
    type: ComponentType.Sketch
  };
  await createComponent(componentData);

  await db.transaction(async (trx: Knex.Transaction) => {
    const duplicateComponent = await findAndDuplicateComponent(componentId, null, trx);
    t.deepEqual(
      {
        artworkId: duplicateComponent.artworkId,
        createdBy: duplicateComponent.createdBy,
        id: duplicateComponent.id,
        materialId: duplicateComponent.materialId,
        parentId: duplicateComponent.parentId,
        sketchId: duplicateComponent.sketchId,
        type: duplicateComponent.type
      },
      {
        ...componentData,
        id: duplicateComponent.id
      },
      'Duplicating a component returns the same component but with a new id'
    );
  });
});

test('findAndDuplicateComponent with sub-resources', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const imageId = uuid.v4();
  const imageData = {
    description: '',
    id: imageId,
    mimeType: 'image/png',
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: '',
    userId: user.id
  };
  await createImage(imageData);

  const componentId = uuid.v4();
  const componentData = {
    artworkId: null,
    createdBy: user.id,
    id: componentId,
    materialId: null,
    parentId: null,
    sketchId: imageId,
    type: ComponentType.Sketch
  };
  await createComponent(componentData);

  await db.transaction(async (trx: Knex.Transaction) => {
    const duplicateComponent = await findAndDuplicateComponent(componentId, null, trx);
    t.deepEqual(
      {
        artworkId: duplicateComponent.artworkId,
        createdBy: duplicateComponent.createdBy,
        id: duplicateComponent.id,
        materialId: duplicateComponent.materialId,
        parentId: duplicateComponent.parentId,
        sketchId: duplicateComponent.sketchId,
        type: duplicateComponent.type
      },
      {
        ...componentData,
        id: duplicateComponent.id,
        sketchId: duplicateComponent.sketchId
      },
      'Duplicating a component returns the same component but with a new id'
    );
  });
});

test('findAndDuplicateMeasurements', async (t: tape.Test) => {
  const { canvas, createdBy, measurement } = await generateMeasurement({
    name: 'wattup'
  });
  const { measurement: measurementTwo } = await generateMeasurement({
    canvasId: canvas.id,
    createdBy: createdBy.id,
    name: 'yo'
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    const duplicateMeasurements = await findAndDuplicateMeasurements(canvas.id, trx);
    const m1 = duplicateMeasurements.find((m: Measurement): boolean => m.name === 'wattup');
    const m2 = duplicateMeasurements.find((m: Measurement): boolean => m.name === 'yo');
    if (!m1 || !m2) { throw new Error('Duplicate measurements were not found!'); }

    t.equal(duplicateMeasurements.length, 2, 'Only the two created measurements were duplicated.');
    t.deepEqual(
      [omit(m1, 'createdAt'), omit(m2, 'createdAt')],
      [
        omit({ ...measurement, id: m1.id }, 'createdAt'),
        omit({ ...measurementTwo, id: m2.id }, 'createdAt')
      ],
      'Returns the duplicate measurements'
    );
  });
});
