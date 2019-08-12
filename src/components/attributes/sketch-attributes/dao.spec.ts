import * as tape from 'tape';
import * as uuid from 'node-uuid';
import * as Knex from 'knex';

import { test } from '../../../test-helpers/fresh';
import createUser = require('../../../test-helpers/create-user');
import * as db from '../../../services/db';
import generateNode from '../../../test-helpers/factories/node';
import generateAsset from '../../../test-helpers/factories/asset';
import * as SketchesDAO from './dao';
import SketchAttribute from './domain-objects';

test('SketchAttributesDAO supports creation and retrieval', async (t: tape.Test) => {
  const { user } = await createUser({ withAddress: false });
  const { asset } = await generateAsset({ userId: user.id });
  const id1 = uuid.v4();

  await db.transaction(async (trx: Knex.Transaction) => {
    const { node: node1 } = await generateNode({ createdBy: user.id }, trx);
    const sketch1Data: SketchAttribute = {
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
    const sketch1 = await SketchesDAO.create(sketch1Data, trx);
    const foundArtwork = await SketchesDAO.findById(id1, trx);
    const foundAll = await SketchesDAO.findAllByNodes([node1.id], trx);

    t.deepEqual(sketch1, sketch1Data, 'Successfully saves with the data');
    t.deepEqual(sketch1, foundArtwork, 'Can find by id');
    t.deepEqual(
      foundAll,
      [{ ...sketch1Data, asset }],
      'Returns all sketches with the asset attached.'
    );
  });
});
