import createCollection from './collection';
import * as CollectionsDAO from '../../components/collections/dao';
import ProductDesignsDAO = require('../../dao/product-designs');
import Collection from '../../components/collections/domain-object';
import { findById as findUserById } from '../../components/users/dao';
import createUser = require('../create-user');
import User from '../../components/users/domain-object';
import ProductDesign = require('../../domain-objects/product-design');

interface CollectionWithResources {
  collection: Collection;
  design: ProductDesign;
  user: User;
}

export default async function createCollectionDesign(
  designerUserId?: string
): Promise<CollectionWithResources> {
  const { user }: { user: User | null } = designerUserId
    ? { user: await findUserById(designerUserId) }
    : await createUser({ withSession: false });

  if (!user) {
    throw new Error('User is missing or failed to be created');
  }

  const { collection } = await createCollection({ createdBy: user.id });
  const design = await ProductDesignsDAO.create({
    productType: 'A product type',
    title: 'A design',
    userId: user.id
  });
  await CollectionsDAO.moveDesign(collection.id, design.id);

  return {
    collection,
    design,
    user
  };
}
