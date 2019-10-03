import * as uuid from 'node-uuid';
import * as Knex from 'knex';

import { findById as findUserById } from '../../components/users/dao';
import createUser = require('../create-user');
import User from '../../components/users/domain-object';

import { create } from '../../components/attributes/image-attributes/dao';
import ImageAttribute from '../../components/attributes/image-attributes/domain-objects';

import Node from '../../components/nodes/domain-objects';
import { findById as findNode } from '../../components/nodes/dao';
import generateNode from './node';

import Asset from '../../components/assets/domain-object';
import { findById as findAsset } from '../../components/assets/dao';
import generateAsset from './asset';

export default async function generateImageAttribute(
  options: Partial<ImageAttribute> = {},
  trx: Knex.Transaction
): Promise<{
  asset: Asset;
  createdBy: User;
  node: Node;
  image: ImageAttribute;
}> {
  const { user }: { user: User | null } = options.createdBy
    ? { user: await findUserById(options.createdBy, trx) }
    : await createUser({ withSession: false });
  const { node }: { node: Node | null } = options.nodeId
    ? { node: await findNode(options.nodeId, trx) }
    : await generateNode({}, trx);
  const { asset }: { asset: Asset | null } = options.assetId
    ? { asset: await findAsset(options.assetId) }
    : await generateAsset({});

  if (!asset) {
    throw new Error('Could not get an asset.');
  }

  if (!node) {
    throw new Error('Could not get a node.');
  }

  if (!user) {
    throw new Error('Could not get user.');
  }

  const image = await create(
    staticImageAttribute({
      assetId: asset.id,
      createdBy: user.id,
      nodeId: node.id,
      ...options
    }),
    trx
  );

  return {
    asset,
    createdBy: user,
    node,
    image
  };
}

export function staticImageAttribute(
  options: Partial<ImageAttribute> = {}
): ImageAttribute {
  return {
    assetId: uuid.v4(),
    createdAt: new Date('2019-04-20'),
    createdBy: uuid.v4(),
    deletedAt: null,
    id: uuid.v4(),
    height: 0,
    nodeId: uuid.v4(),
    width: 0,
    x: 0,
    y: 0,
    ...options
  };
}
