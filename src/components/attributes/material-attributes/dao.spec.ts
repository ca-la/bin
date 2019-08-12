import * as tape from 'tape';
import * as uuid from 'node-uuid';
import * as Knex from 'knex';

import { test } from '../../../test-helpers/fresh';
import createUser = require('../../../test-helpers/create-user');
import * as db from '../../../services/db';
import generateNode from '../../../test-helpers/factories/node';
import generateAsset from '../../../test-helpers/factories/asset';
import * as MaterialsDAO from './dao';
import MaterialAttribute from './domain-objects';

test('MaterialAttributesDAO supports creation and retrieval', async (t: tape.Test) => {
  const { user } = await createUser({ withAddress: false });
  const { asset } = await generateAsset({ userId: user.id });
  const id1 = uuid.v4();

  await db.transaction(async (trx: Knex.Transaction) => {
    const { node: node1 } = await generateNode({ createdBy: user.id }, trx);
    const material1Data: MaterialAttribute = {
      assetId: asset.id,
      createdAt: new Date('2019-04-20'),
      createdBy: user.id,
      deletedAt: null,
      id: id1,
      height: 1000,
      nodeId: node1.id,
      width: 1000
    };
    const material1 = await MaterialsDAO.create(material1Data, trx);
    const foundArtwork = await MaterialsDAO.findById(id1, trx);
    const foundAll = await MaterialsDAO.findAllByNodes([node1.id], trx);

    t.deepEqual(material1, material1Data, 'Successfully saves with the data');
    t.deepEqual(material1, foundArtwork, 'Can find by id');
    t.deepEqual(
      foundAll,
      [{ ...material1Data, asset }],
      'Returns all materials with the asset attached.'
    );
  });
});
