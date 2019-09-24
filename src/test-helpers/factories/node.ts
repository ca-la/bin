import * as uuid from 'node-uuid';
import * as Knex from 'knex';

import { create } from '../../components/nodes/dao';
import { findById as findUserById } from '../../components/users/dao';
import createUser = require('../create-user');
import User from '../../components/users/domain-object';
import Node from '../../components/nodes/domain-objects';

export default async function generateNode(
  options: Partial<Node> = {},
  trx: Knex.Transaction
): Promise<{ node: Node; createdBy: User }> {
  const { user }: { user: User | null } = options.createdBy
    ? { user: await findUserById(options.createdBy) }
    : await createUser({ withSession: false });

  if (!user) {
    throw new Error('Could not get user');
  }

  const node = await create(
    staticNode({ ...options, createdBy: user.id }),
    trx
  );

  return {
    node,
    createdBy: user
  };
}

/**
 * Creates an in-memory instance of a node
 */
export function staticNode(options?: Partial<Node>): Node {
  return {
    id: uuid.v4(),
    createdAt: new Date('2019-04-20'),
    createdBy: uuid.v4(),
    deletedAt: null,
    parentId: null,
    x: 0,
    y: 0,
    ordering: 0,
    title: null,
    ...options
  };
}
