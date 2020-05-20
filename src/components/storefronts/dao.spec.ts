import * as Knex from "knex";
import { ProviderName } from "@cala/ts-lib";

import db from "../../services/db";
import { test, Test } from "../../test-helpers/fresh";
import createUser = require("../../test-helpers/create-user");
import * as StorefrontsDAO from "./dao";
import { createStorefront } from "../../services/create-storefront";

test("StorefrontsDAO can save and retrieve stores", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  await db.transaction(async (trx: Knex.Transaction) => {
    const created = await StorefrontsDAO.create({
      data: {
        createdBy: user.id,
        name: "My Cool Store",
      },
      trx,
    });
    const found = await StorefrontsDAO.findById({ trx, id: created.id });

    t.deepEqual(created, found);
  });
});

test("StorefrontsDAO can retrieve a store by a user id", async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  const created = await createStorefront({
    accessToken: "some-super-secure-access-token",
    baseUrl: "https://some-shoppe.myshopify.com",
    name: "some-shoppe",
    providerName: ProviderName.SHOPIFY,
    userId: user.id,
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    const found = await StorefrontsDAO.findByUserId({ trx, userId: user.id });

    t.deepEqual(found, created);
  });
});
