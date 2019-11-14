import uuid from 'node-uuid';
import { create } from '../../components/components/dao';
import Component, {
  ComponentType
} from '../../components/components/domain-object';
import { findById as findUserById } from '../../components/users/dao';
import { findById as findAssetById } from '../../components/assets/dao';
import createUser = require('../create-user');
import Asset from '../../components/assets/domain-object';
import generateAsset from './asset';

interface ComponentWithResources {
  component: Component;
  asset: Asset;
  createdBy: any;
}

export default async function generateComponent(
  options: Partial<Component>
): Promise<ComponentWithResources> {
  const user = options.createdBy
    ? await findUserById(options.createdBy)
    : await createUser({ withSession: false }).then(
        (response: any): any => response.user
      );

  const assetId =
    options.sketchId || options.materialId || options.artworkId || null;
  const { asset } = assetId
    ? { asset: await findAssetById(assetId) }
    : await generateAsset();
  if (!asset) {
    throw new Error('Asset could not be found');
  }

  const component = await create({
    artworkId: null,
    createdBy: user.id,
    id: options.id || uuid.v4(),
    materialId: options.materialId || null,
    parentId: options.parentId || null,
    sketchId: options.sketchId || asset.id,
    type: options.type || ComponentType.Sketch
  });

  return { asset, component, createdBy: user };
}
