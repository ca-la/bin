import * as tape from 'tape';
import * as uuid from 'node-uuid';
import * as Knex from 'knex';

import * as db from '../../services/db';
import { test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');

import { create as createOption } from '../../dao/product-design-options';
import { findAndDuplicateOption } from './options';
import generateAsset from '../../test-helpers/factories/asset';

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
  await generateAsset(imageData);

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
