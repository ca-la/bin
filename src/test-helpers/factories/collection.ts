import uuid from 'node-uuid';
import { create } from '../../components/collections/dao';
import Collection from '../../components/collections/domain-object';
import { findById as findUserById } from '../../components/users/dao';
import createUser = require('../create-user');

interface CollectionWithResources {
  collection: Collection;
  createdBy: any;
}

export default async function generateCollection(
  options: Partial<Collection> = {}
): Promise<CollectionWithResources> {
  const { user } = options.createdBy
    ? { user: await findUserById(options.createdBy) }
    : await createUser({ withSession: false });

  const collection = await create({
    createdAt: options.createdAt || new Date(),
    createdBy: user.id,
    deletedAt: options.deletedAt || null,
    description: options.description || null,
    id: options.id || uuid.v4(),
    title: options.title || null
  });

  return { collection, createdBy: user };
}
