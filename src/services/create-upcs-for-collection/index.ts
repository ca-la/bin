import Knex from "knex";

import * as VariantsDAO from "../../components/product-design-variants/dao";
import { computeUniqueUpc } from "../upc";
import db from "../../services/db";

export default async function createUPCsForCollection(
  collectionId: string
): Promise<void> {
  await db.transaction(async (trx: Knex.Transaction) => {
    const variants = await VariantsDAO.findByCollectionId(collectionId, trx);
    const updatedVariants = [];
    for (const variant of variants) {
      const universalProductCode = await computeUniqueUpc();
      const updated = await VariantsDAO.update(
        variant.id,
        { universalProductCode },
        trx
      );
      updatedVariants.push(updated);
    }
    return updatedVariants;
  });
}
