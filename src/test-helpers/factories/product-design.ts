import Knex from "knex";
import uuid from "node-uuid";

import createDesign from "../../services/create-design";
import ProductDesign = require("../../components/product-designs/domain-objects/product-design");

export function generateDesign(
  options: Partial<ProductDesign>,
  trx?: Knex.Transaction
): Promise<ProductDesign> {
  return createDesign(staticProductDesign(options), trx);
}

/**
 * Creates an in-memory instance of a ProductDesign.
 */
export function staticProductDesign(
  options: Partial<ProductDesign> = {}
): ProductDesign {
  return {
    id: uuid.v4(),
    createdAt: new Date("2019-04-20"),
    productType: "SHIRT",
    title: "My Shirt",
    userId: "user-one",
    ...options,
  };
}
