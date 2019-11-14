import Knex from 'knex';

import LayoutAttribute from '../../../components/attributes/layout-attributes/domain-object';
import {
  create,
  findById
} from '../../../components/attributes/layout-attributes/dao';
import prepareForDuplication from '../prepare-for-duplication';

/**
 * Creates a duplicate instance of the given Layout Attribute.
 */
export default async function findAndDuplicateLayout(options: {
  currentLayout?: LayoutAttribute;
  currentLayoutId: string;
  newCreatorId: string;
  newNodeId: string;
  trx: Knex.Transaction;
}): Promise<LayoutAttribute> {
  const {
    currentLayout,
    currentLayoutId,
    newCreatorId,
    newNodeId,
    trx
  } = options;

  const layout = currentLayout
    ? currentLayout
    : await findById(currentLayoutId, trx);

  if (!layout) {
    throw new Error(`Layout attribute ${currentLayoutId} not found.`);
  }

  const preparedLayout = prepareForDuplication(layout, {
    createdBy: newCreatorId,
    nodeId: newNodeId
  });

  return create(preparedLayout, trx);
}
