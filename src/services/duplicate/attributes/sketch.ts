import * as Knex from 'knex';

import SketchAttribute from '../../../components/attributes/sketch-attributes/domain-objects';
import {
  create,
  findById
} from '../../../components/attributes/sketch-attributes/dao';
import prepareForDuplication from '../prepare-for-duplication';

/**
 * Creates a duplicate instance of the given Sketch Attribute.
 */
export default async function findAndDuplicateSketch(options: {
  currentSketch?: SketchAttribute;
  currentSketchId: string;
  newCreatorId: string;
  newNodeId: string;
  trx: Knex.Transaction;
}): Promise<SketchAttribute> {
  const {
    currentSketch,
    currentSketchId,
    newCreatorId,
    newNodeId,
    trx
  } = options;

  const sketch = currentSketch
    ? currentSketch
    : await findById(currentSketchId, trx);

  if (!sketch) {
    throw new Error(`Sketch attribute ${currentSketchId} not found.`);
  }

  const preparedSketch = prepareForDuplication(sketch, {
    createdBy: newCreatorId,
    nodeId: newNodeId
  });

  return create(preparedSketch, trx);
}
