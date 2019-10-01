import * as tape from 'tape';
import * as uuid from 'node-uuid';
import * as Knex from 'knex';

import { test } from '../../../test-helpers/fresh';
import createUser = require('../../../test-helpers/create-user');
import * as db from '../../../services/db';
import generateNode from '../../../test-helpers/factories/node';
import generateAsset from '../../../test-helpers/factories/asset';
import * as ImagesDAO from './dao';
import ImageAttribute from './domain-objects';

test('ImageAttributesDAO supports creation and retrieval', async (t: tape.Test) => {
  const { user } = await createUser({ withAddress: false });
  const { asset } = await generateAsset({ userId: user.id });
  const id1 = uuid.v4();

  await db.transaction(async (trx: Knex.Transaction) => {
    const { node: node1 } = await generateNode({ createdBy: user.id }, trx);
    const image1Data: ImageAttribute = {
      assetId: asset.id,
      createdAt: new Date('2019-04-20'),
      createdBy: user.id,
      deletedAt: null,
      id: id1,
      height: 1000,
      nodeId: node1.id,
      width: 1000,
      x: 0,
      y: 0
    };
    const image1 = await ImagesDAO.create(image1Data, trx);
    const foundArtwork = await ImagesDAO.findById(id1, trx);
    const foundAll = await ImagesDAO.findAllByNodes([node1.id], trx);

    t.deepEqual(image1, image1Data, 'Successfully saves with the data');
    t.deepEqual(image1, foundArtwork, 'Can find by id');
    t.deepEqual(
      foundAll,
      [{ ...image1Data, asset }],
      'Returns all Images with the asset attached.'
    );
  });
});
