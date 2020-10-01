import Knex from "knex";

import * as VariantsDAO from "../../components/product-design-variants/dao";
import { computeUniqueUpc } from "../codes";

export default async function createUPCsForCollection(
  trx: Knex.Transaction,
  collectionId: string
): Promise<void> {
  const variants = await VariantsDAO.findByCollectionId(collectionId, trx);
  for (const variant of variants) {
    const universalProductCode = await computeUniqueUpc();
    await VariantsDAO.update(variant.id, { universalProductCode }, trx);
  }
}
