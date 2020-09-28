import Knex from "knex";
import { VariantDb } from "../../components/product-design-variants/types";

import * as VariantsDAO from "../../components/product-design-variants/dao";
import prepareForDuplication from "./prepare-for-duplication";
import { computeUniqueSku } from "../codes";

/**
 * Finds all variants for the given design and creates duplicates.
 */
export async function findAndDuplicateVariants(
  designId: string,
  newDesignId: string,
  trx: Knex.Transaction
): Promise<VariantDb[]> {
  const variants = await VariantsDAO.findByDesignId(designId);
  return Promise.all(
    variants.map(
      async (variant: VariantDb): Promise<VariantDb> =>
        VariantsDAO.create(
          prepareForDuplication<VariantDb>(variant, {
            designId: newDesignId,
            universalProductCode: null,
            sku: await computeUniqueSku(trx, {
              ...variant,
              designId: newDesignId,
            }),
          }),
          trx
        )
    )
  );
}
