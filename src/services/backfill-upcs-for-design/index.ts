import Knex from "knex";

import * as VariantsDAO from "../../components/product-design-variants/dao";
import { VariantDb } from "../../components/product-design-variants/types";
import { computeUniqueUpc } from "../codes";

export default async function backfillUpcsForDesign(
  ktx: Knex,
  designId: string
): Promise<VariantDb[]> {
  const updatedVariants: VariantDb[] = [];
  const variants = await VariantsDAO.findByDesignId(designId, ktx);
  for (const variant of variants) {
    if (variant.universalProductCode) {
      updatedVariants.push(variant);
    } else {
      const universalProductCode = await computeUniqueUpc();
      updatedVariants.push(
        await VariantsDAO.update(variant.id, { universalProductCode }, ktx)
      );
    }
  }
  return updatedVariants;
}
