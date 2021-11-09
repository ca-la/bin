import Knex from "knex";
import { VariantDb } from "../../components/product-design-variants/types";

import * as VariantsDAO from "../../components/product-design-variants/dao";
import prepareForDuplication from "./prepare-for-duplication";

/**
 * Finds all variants for the given design and creates duplicates.
 */
export async function findAndDuplicateVariants(
  designId: string,
  newDesignId: string,
  trx: Knex.Transaction
): Promise<VariantDb[]> {
  const variants = await VariantsDAO.findByDesignId(designId);

  const duplicatedVariants: VariantDb[] = [];
  for (const variant of variants) {
    const newVariant = await VariantsDAO.create(
      prepareForDuplication<VariantDb>(variant, {
        designId: newDesignId,
        universalProductCode: null,
        sku: null,
      }),
      trx
    );

    duplicatedVariants.push(newVariant);
  }

  return duplicatedVariants;
}
