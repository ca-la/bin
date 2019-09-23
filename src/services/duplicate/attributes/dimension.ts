import * as Knex from 'knex';

import DimensionAttribute from '../../../components/attributes/dimension-attributes/domain-object';
import {
  create,
  findById
} from '../../../components/attributes/dimension-attributes/dao';
import prepareForDuplication from '../prepare-for-duplication';

/**
 * Creates a duplicate instance of the given Dimension Attribute.
 */
export default async function findAndDuplicateDimension(options: {
  currentDimension?: DimensionAttribute;
  currentDimensionId: string;
  newCreatorId: string;
  newNodeId: string;
  trx: Knex.Transaction;
}): Promise<DimensionAttribute> {
  const {
    currentDimension,
    currentDimensionId,
    newCreatorId,
    newNodeId,
    trx
  } = options;

  const dimension = currentDimension
    ? currentDimension
    : await findById(currentDimensionId, trx);

  if (!dimension) {
    throw new Error(`Dimension attribute ${currentDimensionId} not found.`);
  }

  const preparedDimension = prepareForDuplication(dimension, {
    createdBy: newCreatorId,
    nodeId: newNodeId
  });

  return create(preparedDimension, trx);
}
