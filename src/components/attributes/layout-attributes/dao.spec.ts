import * as tape from 'tape';
import * as uuid from 'node-uuid';
import * as Knex from 'knex';

import { test } from '../../../test-helpers/fresh';
import createUser = require('../../../test-helpers/create-user');
import * as db from '../../../services/db';
import generateNode from '../../../test-helpers/factories/node';
import * as LayoutsDAO from './dao';
import Node from '../../../components/nodes/domain-objects';
import { PhidiasLayout } from '@cala/ts-lib/dist/phidias';

async function setup(
  trx: Knex.Transaction
): Promise<{
  nodes: [Node, Node, Node];
  layouts: [PhidiasLayout, PhidiasLayout, PhidiasLayout];
}> {
  const { user } = await createUser({ withAddress: false });
  const { node: node1 } = await generateNode({ createdBy: user.id }, trx);
  const { node: node2 } = await generateNode({ createdBy: user.id }, trx);
  const { node: node3 } = await generateNode({ createdBy: user.id }, trx);
  const layout1Data = {
    createdAt: new Date('2019-04-20'),
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    height: 1000,
    nodeId: node1.id,
    width: 1000
  };
  const layout2Data = {
    createdAt: new Date('2019-04-20'),
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    height: 1000,
    nodeId: node3.id,
    width: 1000
  };
  const layout3Data = {
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
    layouts: [layout1Data, layout2Data, layout3Data]
  };
}

test('LayoutAttributesDAO supports creation and retrieval', async (t: tape.Test) => {
  await db.transaction(async (trx: Knex.Transaction) => {
    const { nodes, layouts } = await setup(trx);

    const created = await LayoutsDAO.create(layouts[0], trx);
    await LayoutsDAO.create(layouts[1], trx);
    await LayoutsDAO.create(layouts[2], trx);

    const foundAll = await LayoutsDAO.findAllByNodes(
      [nodes[0].id, nodes[1].id, nodes[2].id],
      trx
    );

    t.deepEqual(created, layouts[0], 'Successfully saves with the data');
    t.deepEqual(
      foundAll,
      layouts,
      'Returns all layouts with the asset attached.'
    );
  });
});

test('LayoutAttributesDAO supports upsert', async (t: tape.Test) => {
  await db.transaction(async (trx: Knex.Transaction) => {
    const { layouts } = await setup(trx);

    await LayoutsDAO.create(layouts[0], trx);
    await LayoutsDAO.create(layouts[1], trx);
    await LayoutsDAO.create(layouts[2], trx);

    await LayoutsDAO.updateOrCreate({ ...layouts[0], width: 100 }, trx);

    const foundWithUpdates = await LayoutsDAO.findById(layouts[0].id, trx);
    t.equal(layouts[0].id, foundWithUpdates!.id, 'Keeps the same ID');
    t.equal(foundWithUpdates!.width, 100, 'Updates the new value');
    t.equal(
      layouts[0].height,
      foundWithUpdates!.height,
      'Keeps the other values'
    );
  });
});

test('LayoutAttributesDAO supports update', async (t: tape.Test) => {
  await db.transaction(async (trx: Knex.Transaction) => {
    const { layouts } = await setup(trx);

    await LayoutsDAO.create(layouts[0], trx);
    await LayoutsDAO.create(layouts[1], trx);
    await LayoutsDAO.create(layouts[2], trx);

    await LayoutsDAO.update(layouts[0].id, { ...layouts[0], height: 100 }, trx);
    const foundWithFurtherUpdates = await LayoutsDAO.findById(
      layouts[0].id,
      trx
    );
    t.equal(foundWithFurtherUpdates!.height, 100, 'Updates the new value');
  });
});
