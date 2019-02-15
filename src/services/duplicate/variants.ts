import * as Knex from 'knex';

import * as VariantsDAO from '../../dao/product-design-variants';
import Variant from '../../domain-objects/product-design-variant';
import prepareForDuplication from './prepare-for-duplication';

/**
 * Finds all variants for the given design and creates duplicates.
 */
export async function findAndDuplicateVariants(
  designId: string,
  newDesignId: string,
  trx: Knex.Transaction
): Promise<Variant[]> {
  const variants = await VariantsDAO.findByDesignId(designId);
  return Promise.all(variants.map((variant: Variant): Promise<Variant> =>
    VariantsDAO.create(
      prepareForDuplication(variant, { designId: newDesignId }),
      trx
    )
  ));
}
