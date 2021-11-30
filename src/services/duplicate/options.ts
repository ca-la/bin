import Knex from "knex";

import ProductDesignOptionDAO from "../../components/product-design-options/dao";
import { ProductDesignOption } from "../../components/product-design-options/types";
import prepareForDuplication from "./prepare-for-duplication";

/**
 * Finds and duplicates the given product design option (and associated sub-resources).
 * Note: image ids are maintained since images are immutable.
 */
export async function findAndDuplicateOption(
  optionId: string,
  trx: Knex.Transaction
): Promise<ProductDesignOption> {
  const option = await ProductDesignOptionDAO.findById(trx, optionId);

  if (!option) {
    throw new Error(`Could not find product design option ${optionId}!`);
  }

  return ProductDesignOptionDAO.create(
    trx,
    ProductDesignOptionDAO.getOptionDefaults(prepareForDuplication(option))
  );
}
