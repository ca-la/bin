import * as tape from 'tape';
import * as uuid from 'node-uuid';
import * as Knex from 'knex';

import { test } from '../../test-helpers/fresh';
import * as NodesDAO from './dao';
import createUser = require('../../test-helpers/create-user');
import * as db from '../../services/db';
import createDesign from '../../services/create-design';

test('NodesDAO supports creation and retrieval', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: user.id
  });

  const id1 = uuid.v4();
  const id2 = uuid.v4();
  const id3 = uuid.v4();
  const node1Data = {
    id: id1,
    createdAt: new Date('2019-04-20'),
    createdBy: user.id,
    deletedAt: null,
    parentId: null,
    x: 103,
    y: 50,
    ordering: 0,
    title: null
  };
  const node2Data = {
    id: id2,
    createdAt: new Date('2019-04-20'),
    createdBy: user.id,
    deletedAt: null,
    parentId: node1Data.id,
    x: 905,
    y: 1000,
    ordering: 0,
    title: null
  };
  const node3Data = {
    id: id3,
    createdAt: new Date('2019-04-20'),
    createdBy: user.id,
    deletedAt: null,
    parentId: null,
    x: 0,
    y: 0,
    ordering: 1,
    title: null
  };

  await db.transaction(async (trx: Knex.Transaction) => {
    const node1 = await NodesDAO.createDesignRoot(node1Data, design.id, trx);
    const node2 = await NodesDAO.create(node2Data, trx);
    const node3 = await NodesDAO.createDesignRoot(node3Data, design.id, trx);

    t.deepEqual(node1, node1Data, 'Returns the first object that was created.');
    t.deepEqual(
      node2,
      node2Data,
      'Returns the second object that was created.'
    );

    const rootResult = await NodesDAO.findRootNodesByDesign(design.id, trx);
    t.deepEqual([node1, node3], rootResult, 'Returns the list of design roots');
  });
});

test('NodesDAO supports returning a tree association as a list', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: user.id
  });

  const baseData = {
    createdAt: new Date('2019-04-20'),
    createdBy: user.id,
    deletedAt: null,
    title: null
  };

  const id1 = '1f8a29f2-9254-48be-8fbf-eed45435a30c';
  const id2 = '2158dd31-ee03-4217-a403-2158f87240c5';
  const id3 = '848c5ed9-0741-4e98-a6e9-e953e8fc4251';
  const id4 = '4983c44d-ec1b-4ba2-a613-d8ccaac37bad';
  const node1Data = {
    ...baseData,
    id: id1,
    parentId: null,
    x: 103,
    y: 50,
    ordering: 0
  };
  const node2Data = {
    ...baseData,
    id: id2,
    parentId: id1,
    x: 905,
    y: 1000,
    ordering: 0
  };
  const node3Data = {
    ...baseData,
    id: id3,
    parentId: null,
    x: 0,
    y: 0,
    ordering: 1
  };
  const node4Data = {
    ...baseData,
    id: id4,
    parentId: id2,
    x: 0,
    y: 0,
    ordering: 0
  };

  await db.transaction(async (trx: Knex.Transaction) => {
    const node1 = await NodesDAO.createDesignRoot(node1Data, design.id, trx);
    const node2 = await NodesDAO.create(node2Data, trx);
    const node3 = await NodesDAO.createDesignRoot(node3Data, design.id, trx);
    const node4 = await NodesDAO.create(node4Data, trx);

    const resultList = await NodesDAO.findNodeTrees([node1.id, node3.id], trx);
    t.deepEqual(
      resultList,
      [node1, node3, node2, node4],
      'Returns all nodes in the trees'
    );
  });
});
