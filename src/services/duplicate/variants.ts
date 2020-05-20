import Knex from "knex";
import { Variant } from "@cala/ts-lib";

import * as VariantsDAO from "../../components/product-design-variants/dao";
import prepareForDuplication from "./prepare-for-duplication";

/**
 * Finds all variants for the given design and creates duplicates.
 */
export async function findAndDuplicateVariants(
  designId: string,
  newDesignId: string,
  trx: Knex.Transaction
): Promise<Variant[]> {
  const variants = await VariantsDAO.findByDesignId(designId);
  return Promise.all(
    variants.map(
      (variant: Variant): Promise<Variant> =>
        VariantsDAO.create(
          prepareForDuplication<Variant>(variant, {
            designId: newDesignId,
            universalProductCode: null,
          }),
          trx
        )
    )
  );
}
