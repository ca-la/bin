import * as Knex from "knex";

import db from "../../services/db";
import { test, Test } from "../../test-helpers/fresh";
import * as ShopifyProductsDAO from "./dao";
import createDesign from "../../services/create-design";
import createUser from "../../test-helpers/create-user";
import uuid from "node-uuid";

test("ShopifyProductsDAO can save and retrieve products", async (t: Test) => {
  const { user } = await createUser();
  const design = await createDesign({
    title: "test",
    productType: "product",
    userId: user.id,
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    const created = await ShopifyProductsDAO.create(
      {
        createdAt: new Date(),
        deletedAt: null,
        designId: design.id,
        id: uuid.v4(),
        shopifyId: "12345",
      },
      trx
    );
    const found = await ShopifyProductsDAO.findById(created.id, trx);
    const foundByShopifyId = await ShopifyProductsDAO.findByShopifyId(
      created.shopifyId,
      trx
    );

    t.deepEqual(created, found, "objects are the same by id");
    t.deepEqual(
      [created],
      foundByShopifyId,
      "objects are the same by shopify id"
    );
    return;
  });
});
