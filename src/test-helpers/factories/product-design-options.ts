import Knex from "knex";

import db from "../../services/db";
import { ProductDesignOption } from "../../components/product-design-options/types";
import ProductDesignOptionDAO from "../../components/product-design-options/dao";

export async function generateProductDesignOption(
  options: Partial<ProductDesignOption>,
  trx?: Knex.Transaction
): Promise<ProductDesignOption> {
  const transaction = trx ? trx : await db.transaction();
  const productDesignOption = await ProductDesignOptionDAO.create(transaction, {
    ...ProductDesignOptionDAO.getOptionDefaults(),
    ...options,
  });

  if (!trx) {
    await transaction.commit();
  }

  return productDesignOption;
}
