import * as uuid from 'node-uuid';
import * as Knex from 'knex';

import { findById as findUserById } from '../../components/users/dao';
import createUser = require('../create-user');
import User from '../../components/users/domain-object';

import { create } from '../../components/attributes/artwork-attributes/dao';
import ArtworkAttribute from '../../components/attributes/artwork-attributes/domain-objects';

import Node from '../../components/nodes/domain-objects';
import { findById as findNode } from '../../components/nodes/dao';
import generateNode from './node';

import Asset from '../../components/assets/domain-object';
import { findById as findAsset } from '../../components/assets/dao';
import generateAsset from './asset';

export default async function generateArtworkAttribute(
  options: Partial<ArtworkAttribute> = {},
  trx: Knex.Transaction
): Promise<{
  asset: Asset;
  artwork: ArtworkAttribute;
  createdBy: User;
  node: Node;
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

  const artworkData: ArtworkAttribute = {
    assetId: asset.id,
    createdAt: new Date('2019-04-20'),
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    height: 0,
    nodeId: node.id,
    width: 0,
    x: 0,
    y: 0,
    ...options
  };
  const artwork = await create(artworkData, trx);

  return {
    asset,
    artwork,
    createdBy: user,
    node
  };
}
