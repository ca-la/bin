import Knex from 'knex';

import ImageAttribute from '../../../components/attributes/image-attributes/domain-objects';
import {
  create,
  findById
} from '../../../components/attributes/image-attributes/dao';
import prepareForDuplication from '../prepare-for-duplication';

/**
 * Creates a duplicate instance of the given Image Attribute.
 */
export default async function findAndDuplicateImage(options: {
  currentImage?: ImageAttribute;
  currentImageId: string;
  newCreatorId: string;
  newNodeId: string;
  trx: Knex.Transaction;
}): Promise<ImageAttribute> {
  const {
    currentImage,
    currentImageId,
    newCreatorId,
    newNodeId,
    trx
  } = options;

  const image = currentImage
    ? currentImage
    : await findById(currentImageId, trx);

  if (!image) {
    throw new Error(`Image attribute ${currentImageId} not found.`);
  }

  const preparedImage = prepareForDuplication(image, {
    createdBy: newCreatorId,
    nodeId: newNodeId
  });

  return create(preparedImage, trx);
}
