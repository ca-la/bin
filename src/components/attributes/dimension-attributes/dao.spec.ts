import * as tape from 'tape';
import * as uuid from 'node-uuid';
import * as Knex from 'knex';

import { test } from '../../../test-helpers/fresh';
import createUser = require('../../../test-helpers/create-user');
import * as db from '../../../services/db';
import generateNode from '../../../test-helpers/factories/node';
import * as DimensionsDAO from './dao';
import Node from '../../../components/nodes/domain-objects';
import { PhidiasDimension } from '@cala/ts-lib/dist/phidias';

async function setup(
  trx: Knex.Transaction
): Promise<{
  nodes: [Node, Node, Node];
  dimensions: [PhidiasDimension, PhidiasDimension, PhidiasDimension];
}> {
  const { user } = await createUser({ withAddress: false });
  const { node: node1 } = await generateNode({ createdBy: user.id }, trx);
  const { node: node2 } = await generateNode({ createdBy: user.id }, trx);
  const { node: node3 } = await generateNode({ createdBy: user.id }, trx);
  const dimension1Data = {
    createdAt: new Date('2019-04-20'),
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    height: 1000,
    nodeId: node1.id,
    width: 1000
  };
  const dimension2Data = {
    createdAt: new Date('2019-04-20'),
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    height: 1000,
    nodeId: node3.id,
    width: 1000
  };
  const dimension3Data = {
    createdAt: new Date('2019-04-20'),
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    height: 1000,
    nodeId: node3.id,
    width: 1000
  };

  return {
    nodes: [node1, node2, node3],
    dimensions: [dimension1Data, dimension2Data, dimension3Data]
  };
}

test('DimensionAttributesDAO supports creation and retrieval', async (t: tape.Test) => {
  await db.transaction(async (trx: Knex.Transaction) => {
    const { nodes, dimensions } = await setup(trx);

    const created = await DimensionsDAO.create(dimensions[0], trx);
    await DimensionsDAO.create(dimensions[1], trx);
    await DimensionsDAO.create(dimensions[2], trx);

    const foundAll = await DimensionsDAO.findAllByNodes(
      [nodes[0].id, nodes[1].id, nodes[2].id],
      trx
    );

    t.deepEqual(created, dimensions[0], 'Successfully saves with the data');
    t.deepEqual(
      foundAll,
      dimensions,
      'Returns all dimensions with the asset attached.'
    );
  });
});

test('DimensionAttributesDAO supports upsert', async (t: tape.Test) => {
  await db.transaction(async (trx: Knex.Transaction) => {
    const { dimensions } = await setup(trx);

    await DimensionsDAO.create(dimensions[0], trx);
    await DimensionsDAO.create(dimensions[1], trx);
    await DimensionsDAO.create(dimensions[2], trx);

    await DimensionsDAO.updateOrCreate({ ...dimensions[0], width: 100 }, trx);

    const foundWithUpdates = await DimensionsDAO.findById(
      dimensions[0].id,
      trx
    );
    t.equal(dimensions[0].id, foundWithUpdates!.id, 'Keeps the same ID');
    t.equal(foundWithUpdates!.width, 100, 'Updates the new value');
    t.equal(
      dimensions[0].height,
      foundWithUpdates!.height,
      'Keeps the other values'
    );
  });
});

test('DimensionAttributesDAO supports update', async (t: tape.Test) => {
  await db.transaction(async (trx: Knex.Transaction) => {
    const { dimensions } = await setup(trx);

    await DimensionsDAO.create(dimensions[0], trx);
    await DimensionsDAO.create(dimensions[1], trx);
    await DimensionsDAO.create(dimensions[2], trx);

    await DimensionsDAO.update(
      dimensions[0].id,
      { ...dimensions[0], height: 100 },
      trx
    );
    const foundWithFurtherUpdates = await DimensionsDAO.findById(
      dimensions[0].id,
      trx
    );
    t.equal(foundWithFurtherUpdates!.height, 100, 'Updates the new value');
  });
});
