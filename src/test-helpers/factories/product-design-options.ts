import Knex from "knex";

import db from "../../services/db";
import { ProductDesignOption } from "../../components/product-design-options/types";
import ProductDesignOptionDAO from "../../components/product-design-options/dao";
import generateAsset from "./asset";

export async function generateProductDesignOption(
  options: Partial<ProductDesignOption> &
    ({ userId: string } | { isBuiltinOption: boolean }) = {
    isBuiltinOption: true,
  },
  trx?: Knex.Transaction
): Promise<ProductDesignOption> {
  const transaction = trx ? trx : await db.transaction();

  let assetId = options.previewImageId;
  if (!assetId) {
    const { asset } = await generateAsset();
    assetId = asset.id;
  }

  const productDesignOption = await ProductDesignOptionDAO.create(transaction, {
    ...ProductDesignOptionDAO.getOptionDefaults(),
    ...options,
    previewImageId: assetId,
  });

  if (!trx) {
    await transaction.commit();
  }

  return productDesignOption;
}
