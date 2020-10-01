import Knex from "knex";

import * as VariantsDAO from "../../components/product-design-variants/dao";
import { computeUniqueSku } from "../codes";

export default async function createSKUsForCollection(
  trx: Knex.Transaction,
  collectionId: string
): Promise<void> {
  const variants = await VariantsDAO.findByCollectionId(collectionId, trx);
  for (const variant of variants) {
    const sku = await computeUniqueSku(trx, variant);
    await VariantsDAO.update(variant.id, { sku }, trx);
  }
}
