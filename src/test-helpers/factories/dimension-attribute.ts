import * as uuid from 'node-uuid';
import * as Knex from 'knex';

import { findById as findUserById } from '../../components/users/dao';
import createUser = require('../create-user');
import User from '../../components/users/domain-object';

import { create } from '../../components/attributes/dimension-attributes/dao';
import DimensionAttribute from '../../components/attributes/dimension-attributes/domain-object';

import Node from '../../components/nodes/domain-objects';
import { findById as findNode } from '../../components/nodes/dao';
import generateNode from './node';

export default async function generateDimensionAttribute(
  options: Partial<DimensionAttribute> = {},
  trx: Knex.Transaction
): Promise<{
  createdBy: User;
  dimension: DimensionAttribute;
  node: Node;
}> {
  const { user }: { user: User | null } = options.createdBy
    ? { user: await findUserById(options.createdBy, trx) }
    : await createUser({ withSession: false });
  const { node }: { node: Node | null } = options.nodeId
    ? { node: await findNode(options.nodeId, trx) }
    : await generateNode({}, trx);

  if (!node) {
    throw new Error('Could not get a node.');
  }

  if (!user) {
    throw new Error('Could not get user.');
  }

  const dimension = await create(
    staticDimensionAttribute({
      createdBy: user.id,
      nodeId: node.id,
      ...options
    }),
    trx
  );

  return {
    createdBy: user,
    dimension,
    node
  };
}

/**
 * Creates an in-memory instance of a dimension attribute.
 */
export function staticDimensionAttribute(
  options?: Partial<DimensionAttribute>
): DimensionAttribute {
  return {
    createdAt: new Date('2019-04-20'),
    createdBy: uuid.v4(),
    deletedAt: null,
    id: uuid.v4(),
    height: 0,
    nodeId: uuid.v4(),
    width: 0,
    ...options
  };
}
