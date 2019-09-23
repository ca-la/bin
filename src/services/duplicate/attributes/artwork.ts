import * as Knex from 'knex';

import ArtworkAttribute from '../../../components/attributes/artwork-attributes/domain-objects';
import {
  create,
  findById
} from '../../../components/attributes/artwork-attributes/dao';
import prepareForDuplication from '../prepare-for-duplication';

/**
 * Creates a duplicate instance of the given Artwork Attribute.
 */
export default async function findAndDuplicateArtwork(options: {
  currentArtwork?: ArtworkAttribute;
  currentArtworkId: string;
  newCreatorId: string;
  newNodeId: string;
  trx: Knex.Transaction;
}): Promise<ArtworkAttribute> {
  const {
    currentArtwork,
    currentArtworkId,
    newCreatorId,
    newNodeId,
    trx
  } = options;

  const artwork = currentArtwork
    ? currentArtwork
    : await findById(currentArtworkId, trx);

  if (!artwork) {
    throw new Error(`Artwork attribute ${currentArtworkId} not found.`);
  }

  const preparedArtwork = prepareForDuplication(artwork, {
    createdBy: newCreatorId,
    nodeId: newNodeId
  });

  return create(preparedArtwork, trx);
}
