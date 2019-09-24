import * as uuid from 'node-uuid';

import { create } from '../../components/assets/dao';
import { findById as findUserById } from '../../components/users/dao';
import createUser = require('../create-user');
import User from '../../components/users/domain-object';
import Asset from '../../components/assets/domain-object';

export default async function generateAsset(
  options: Partial<Asset> = {}
): Promise<{ asset: Asset; createdBy: User }> {
  const { user }: { user: User | null } = options.userId
    ? { user: await findUserById(options.userId) }
    : await createUser({ withSession: false });

  if (!user) {
    throw new Error('Could not get user');
  }

  const asset = await create(
    staticAsset({
      userId: user.id,
      ...options
    })
  );

  return {
    asset,
    createdBy: user
  };
}

/**
 * Creates an in-memory instance of an Asset.
 */
export function staticAsset(options?: Partial<Asset>): Asset {
  return {
    createdAt: new Date(),
    description: null,
    id: uuid.v4(),
    mimeType: 'image/jpeg',
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: null,
    uploadCompletedAt: new Date(),
    userId: uuid.v4(),
    ...options
  };
}
