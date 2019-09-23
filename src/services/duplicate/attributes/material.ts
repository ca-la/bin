import * as Knex from 'knex';

import MaterialAttribute from '../../../components/attributes/material-attributes/domain-objects';
import {
  create,
  findById
} from '../../../components/attributes/material-attributes/dao';
import prepareForDuplication from '../prepare-for-duplication';

/**
 * Creates a duplicate instance of the given Material Attribute.
 */
export default async function findAndDuplicateMaterial(options: {
  currentMaterial?: MaterialAttribute;
  currentMaterialId: string;
  newCreatorId: string;
  newNodeId: string;
  trx: Knex.Transaction;
}): Promise<MaterialAttribute> {
  const {
    currentMaterial,
    currentMaterialId,
    newCreatorId,
    newNodeId,
    trx
  } = options;

  const material = currentMaterial
    ? currentMaterial
    : await findById(currentMaterialId, trx);

  if (!material) {
    throw new Error(`Material attribute ${currentMaterialId} not found.`);
  }

  const preparedMaterial = prepareForDuplication(material, {
    createdBy: newCreatorId,
    nodeId: newNodeId
  });

  return create(preparedMaterial, trx);
}
