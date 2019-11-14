import Knex from 'knex';
import uuid from 'node-uuid';
import { NodeTree } from '@cala/ts-lib/dist/phidias';
import { omit } from 'lodash';

import db from '../db';
import { test, Test } from '../../test-helpers/fresh';

import { findAndDuplicateNode } from './nodes';
import Node from '../../components/nodes/domain-objects';
import { findNodeTrees } from '../../components/nodes/dao';
import generateNode from '../../test-helpers/factories/node';
import createUser = require('../../test-helpers/create-user');

test('findAndDuplicateNode()', async (t: Test) => {
  const { user: duplicator } = await createUser({ withSession: false });

  const a = uuid.v4();
  const b = uuid.v4();
  const c = uuid.v4();
  const d = uuid.v4();

  /**
   *       a
   *     /  \
   *    b    c
   *   /
   *  d
   */
  const tree: NodeTree = {
    [a]: [b, c],
    [b]: [d],
    [c]: [],
    [d]: []
  };

  await db.transaction(async (trx: Knex.Transaction) => {
    const { node: nodeA } = await generateNode(
      {
        id: a,
        ordering: 0,
        title: 'A',
        x: 100,
        y: 105
      },
      trx
    );
    const { node: nodeB } = await generateNode(
      { id: b, parentId: a, ordering: 0, title: 'B' },
      trx
    );
    const { node: nodeC } = await generateNode(
      { id: c, parentId: a, ordering: 1, title: 'C' },
      trx
    );
    const { node: nodeD } = await generateNode(
      { id: d, parentId: b, ordering: 0, title: 'D' },
      trx
    );

    const result = await findAndDuplicateNode({
      isRoot: false,
      newCreatorId: duplicator.id,
      nodeId: a,
      tree,
      trx
    });

    const expectedA = { ...nodeA, createdBy: duplicator.id };
    const expectedB = {
      ...nodeB,
      createdBy: duplicator.id,
      parentId: result.id
    };
    const expectedC = {
      ...nodeC,
      createdBy: duplicator.id,
      parentId: result.id
    };
    const expectedD = {
      ...nodeD,
      createdBy: duplicator.id
    };

    t.deepEqual(
      omit(result, 'id', 'createdAt'),
      omit(expectedA, 'id', 'createdAt'),
      'Returns a duplicated version of the root node.'
    );

    const duplicatedNodes = await findNodeTrees([result.id], trx);
    t.equal(
      duplicatedNodes.length,
      4,
      'Returns the three descendants and the root node.'
    );

    const directChildResults = duplicatedNodes.filter(
      (node: Node): boolean => node.parentId === result.id
    );
    t.equal(
      directChildResults.length,
      2,
      'Returns the duplicates for B and C.'
    );
    t.deepEqual(
      omit(directChildResults[0], 'id', 'createdAt'),
      omit(expectedB, 'id', 'createdAt'),
      'The first child element is the B duplicate.'
    );
    t.deepEqual(
      omit(directChildResults[1], 'id', 'createdAt'),
      omit(expectedC, 'id', 'createdAt'),
      'The second child element is the C duplicate.'
    );

    const dChildResult = duplicatedNodes.find(
      (node: Node): boolean => node.parentId === directChildResults[0].id
    );
    t.deepEqual(
      omit(dChildResult, 'id', 'createdAt', 'parentId'),
      omit(expectedD, 'id', 'createdAt', 'parentId'),
      'The D duplicate is pointing towards the B duplicate.'
    );
  });
});
