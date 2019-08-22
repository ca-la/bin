import * as tape from 'tape';
import * as uuid from 'node-uuid';
import * as Knex from 'knex';

import { test } from '../../../test-helpers/fresh';
import createUser = require('../../../test-helpers/create-user');
import * as db from '../../../services/db';
import generateNode from '../../../test-helpers/factories/node';
import * as DimensionsDAO from './dao';

test('DimensionAttributesDAO supports creation and retrieval', async (t: tape.Test) => {
  const { user } = await createUser({ withAddress: false });
  const id1 = uuid.v4();
  const id2 = uuid.v4();
  const id3 = uuid.v4();

  await db.transaction(async (trx: Knex.Transaction) => {
    const { node: node1 } = await generateNode({ createdBy: user.id }, trx);
    const { node: node2 } = await generateNode({ createdBy: user.id }, trx);
    const { node: node3 } = await generateNode({ createdBy: user.id }, trx);
    const dimension1Data = {
      createdAt: new Date('2019-04-20'),
      createdBy: user.id,
      deletedAt: null,
      id: id1,
      height: 1000,
      nodeId: node1.id,
      width: 1000
    };
    const dimension2Data = {
      createdAt: new Date('2019-04-20'),
      createdBy: user.id,
      deletedAt: null,
      id: id2,
      height: 1000,
      nodeId: node3.id,
      width: 1000
    };
    const dimension3Data = {
      createdAt: new Date('2019-04-20'),
      createdBy: user.id,
      deletedAt: null,
      id: id3,
      height: 1000,
      nodeId: node3.id,
      width: 1000
    };
    const dimension1 = await DimensionsDAO.create(dimension1Data, trx);
    await DimensionsDAO.create(dimension2Data, trx);
    await DimensionsDAO.create(dimension3Data, trx);

    const foundAll = await DimensionsDAO.findAllByNodes(
      [node1.id, node2.id, node3.id],
      trx
    );

    t.deepEqual(dimension1, dimension1Data, 'Successfully saves with the data');
    t.deepEqual(
      foundAll,
      [dimension1Data, dimension2Data, dimension3Data],
      'Returns all dimensions with the asset attached.'
    );
  });
});
