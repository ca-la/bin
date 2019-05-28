import * as Knex from 'knex';

import OptionsDAO = require('../../dao/product-design-options');
import ProductDesignOption = require('../../domain-objects/product-design-option');
import prepareForDuplication from './prepare-for-duplication';

/**
 * Finds and duplicates the given product design option (and associated sub-resources).
 * Note: image ids are maintained since images are immutable.
 */
export async function findAndDuplicateOption(
  optionId: string,
  trx: Knex.Transaction
): Promise<ProductDesignOption> {
  const option = await OptionsDAO.findById(optionId);

  return OptionsDAO.create(prepareForDuplication(option), trx);
}
