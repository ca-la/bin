import uuid from "node-uuid";

import * as ProductDesignVariantsDAO from "../../components/product-design-variants/dao";
import {
  Variant,
  VariantDb,
} from "../../components/product-design-variants/types";

export async function generateProductDesignVariant(
  variantOptions: Partial<Variant> & { designId: string }
): Promise<Variant> {
  const variant = await ProductDesignVariantsDAO.create({
    id: uuid.v4(),
    colorName: "Green",
    unitsToProduce: 100,
    position: 0,
    sizeName: "M",
    universalProductCode: null,
    sku: null,
    isSample: false,
    colorNamePosition: 1,
    ...variantOptions,
  });

  return variant;
}

export async function generateProductDesignVariantDb(
  variantOptions: Partial<Variant> & { designId: string }
): Promise<VariantDb> {
  const variant = await generateProductDesignVariant(variantOptions);

  return {
    ...variant,
    sku: variant.sku === undefined ? null : variant.sku,
  };
}
