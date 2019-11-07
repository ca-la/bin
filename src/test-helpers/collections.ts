import {
  addDesigns,
  moveDesigns,
  removeDesigns
} from '../components/collections/dao/design';
import ProductDesignsDAO = require('../components/product-designs/dao');
import ProductDesign = require('../components/product-designs/domain-objects/product-design');

export async function addDesign(
  collectionId: string,
  designId: string
): Promise<ProductDesign[]> {
  await addDesigns({ collectionId, designIds: [designId] });
  return ProductDesignsDAO.findByCollectionId(collectionId);
}

export async function moveDesign(
  collectionId: string,
  designId: string
): Promise<ProductDesign[]> {
  await moveDesigns({ collectionId, designIds: [designId] });
  return ProductDesignsDAO.findByCollectionId(collectionId);
}

export async function removeDesign(
  collectionId: string,
  designId: string
): Promise<ProductDesign[]> {
  await removeDesigns({ collectionId, designIds: [designId] });
  return ProductDesignsDAO.findByCollectionId(collectionId);
}
