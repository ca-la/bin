import Knex from "knex";

import * as VariantsDAO from "../../components/product-design-variants/dao";
import { computeUniqueSku } from "../codes";
import db from "../../services/db";

export default async function createSKUsForCollection(
  collectionId: string
): Promise<void> {
  await db.transaction(async (trx: Knex.Transaction) => {
    const variants = await VariantsDAO.findByCollectionId(collectionId, trx);
    const updatedVariants = [];
    for (const variant of variants) {
      const sku = await computeUniqueSku(trx, variant);
      const updated = await VariantsDAO.update(variant.id, { sku }, trx);
      updatedVariants.push(updated);
    }
    return updatedVariants;
  });
}
