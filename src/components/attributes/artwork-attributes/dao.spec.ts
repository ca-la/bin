import * as tape from 'tape';
import * as uuid from 'node-uuid';
import * as Knex from 'knex';

import { test } from '../../../test-helpers/fresh';
import createUser = require('../../../test-helpers/create-user');
import * as db from '../../../services/db';
import generateNode from '../../../test-helpers/factories/node';
import generateAsset from '../../../test-helpers/factories/asset';
import * as ArtworksDAO from './dao';

test('ArtworkAttributesDAO supports creation and retrieval', async (t: tape.Test) => {
  const { user } = await createUser({ withAddress: false });
  const { asset } = await generateAsset({ userId: user.id });
  const { asset: asset2 } = await generateAsset({ userId: user.id });
  const id1 = uuid.v4();
  const id2 = uuid.v4();
  const id3 = uuid.v4();

  await db.transaction(async (trx: Knex.Transaction) => {
    const { node: node1 } = await generateNode({ createdBy: user.id }, trx);
    const { node: node2 } = await generateNode({ createdBy: user.id }, trx);
    const { node: node3 } = await generateNode({ createdBy: user.id }, trx);
    const artwork1Data = {
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
    const artwork2Data = {
      assetId: asset.id,
      createdAt: new Date('2019-04-20'),
      createdBy: user.id,
      deletedAt: null,
      id: id2,
      height: 1000,
      nodeId: node3.id,
      width: 1000,
      x: 0,
      y: 0
    };
    const artwork3Data = {
      assetId: asset2.id,
      createdAt: new Date('2019-04-20'),
      createdBy: user.id,
      deletedAt: null,
      id: id3,
      height: 1000,
      nodeId: node3.id,
      width: 1000,
      x: 0,
      y: 0
    };
    const artwork1 = await ArtworksDAO.create(artwork1Data, trx);
    await ArtworksDAO.create(artwork2Data, trx);
    await ArtworksDAO.create(artwork3Data, trx);
    const foundArtwork = await ArtworksDAO.findById(id1, trx);

    const foundAll = await ArtworksDAO.findAllByNodes(
      [node1.id, node2.id, node3.id],
      trx
    );

    t.deepEqual(artwork1, artwork1Data, 'Successfully saves with the data');
    t.deepEqual(artwork1, foundArtwork, 'Can find by id');
    t.deepEqual(
      foundAll,
      [
        { ...artwork1Data, asset },
        { ...artwork2Data, asset },
        { ...artwork3Data, asset: asset2 }
      ],
      'Returns all artworks with the asset attached.'
    );
  });
});
