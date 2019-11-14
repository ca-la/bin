import Knex from 'knex';
import { omit } from 'lodash';
import { NodeAttributes } from '../../../components/nodes/services/get-all-by-design';

import { findAllByNodes as findAllLayouts } from '../../../components/attributes/layout-attributes/dao';
import { findAllByNodes as findAllMaterials } from '../../../components/attributes/material-attributes/dao';
import { findAllByNodes as findAllImages } from '../../../components/attributes/image-attributes/dao';
import findAndDuplicateLayout from './layout';
import findAndDuplicateMaterial from './material';
import findAndDuplicateImage from './image';
import LayoutAttribute from '../../../components/attributes/layout-attributes/domain-object';
import MaterialAttribute from '../../../components/attributes/material-attributes/domain-objects';
import ImageAttribute from '../../../components/attributes/image-attributes/domain-objects';

/**
 * Duplicates all attributes related to the given node.
 */
export default async function findAndDuplicateAttributesForNode(options: {
  currentNodeId: string;
  newCreatorId: string;
  newNodeId: string;
  trx: Knex.Transaction;
}): Promise<NodeAttributes> {
  const { currentNodeId, newCreatorId, newNodeId, trx } = options;

  const layouts = await findAllLayouts([currentNodeId], trx);
  const materials = await findAllMaterials([currentNodeId], trx);
  const images = await findAllImages([currentNodeId], trx);

  const duplicateLayouts: LayoutAttribute[] = [];
  const duplicateMaterials: MaterialAttribute[] = [];
  const duplicateImages: ImageAttribute[] = [];

  for (const layout of layouts) {
    const duplicateLayout = await findAndDuplicateLayout({
      currentLayout: layout,
      currentLayoutId: layout.id,
      newCreatorId,
      newNodeId,
      trx
    });
    duplicateLayouts.push(duplicateLayout);
  }

  for (const material of materials) {
    const duplicateMaterial = await findAndDuplicateMaterial({
      currentMaterial: omit(material, 'asset'),
      currentMaterialId: material.id,
      newCreatorId,
      newNodeId,
      trx
    });
    duplicateMaterials.push(duplicateMaterial);
  }

  for (const image of images) {
    const duplicateImage = await findAndDuplicateImage({
      currentImage: omit(image, 'asset'),
      currentImageId: image.id,
      newCreatorId,
      newNodeId,
      trx
    });
    duplicateImages.push(duplicateImage);
  }

  return {
    artworks: [],
    dimensions: duplicateLayouts,
    materials: duplicateMaterials,
    sketches: duplicateImages
  };
}
