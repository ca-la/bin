import uuid from "node-uuid";
import { VariantDb } from "../../components/product-design-variants/types";
import Knex from "knex";

import { create as createDesign } from "../../components/product-designs/dao";
import createUser = require("../../test-helpers/create-user");
import { test, Test } from "../../test-helpers/fresh";

import {
  findByCollectionId,
  replaceForDesign,
} from "../../components/product-design-variants/dao";
import generateCollection from "../../test-helpers/factories/collection";
import { addDesign } from "../../test-helpers/collections";
import createUPCsForCollection from ".";
import db from "../db";

async function createPrerequisites(): Promise<any> {
  const { user } = await createUser({ withSession: false });

  const design = await createDesign({
    productType: "TEESHIRT",
    title: "Plain White Tee",
    userId: user.id,
  });

  const { collection } = await generateCollection();
  await addDesign(collection.id, design.id);

  return await db.transaction(async (trx: Knex.Transaction) => {
    const variants = await replaceForDesign(trx, design.id, [
      {
        colorName: "Green",
        designId: design.id,
        id: uuid.v4(),
        position: 0,
        sizeName: "M",
        unitsToProduce: 123,
        universalProductCode: null,
        sku: null,
        isSample: false,
        colorNamePosition: 1,
      },
      {
        colorName: "Red",
        designId: design.id,
        id: uuid.v4(),
        position: 1,
        sizeName: "L",
        unitsToProduce: 456,
        universalProductCode: null,
        sku: null,
        isSample: false,
        colorNamePosition: 2,
      },
      {
        colorName: "Red",
        designId: design.id,
        id: uuid.v4(),
        position: 2,
        sizeName: "M",
        unitsToProduce: 789,
        universalProductCode: null,
        sku: null,
        isSample: false,
        colorNamePosition: 3,
      },
      {
        colorName: "Red",
        designId: design.id,
        id: uuid.v4(),
        position: 3,
        sizeName: "XL but not actually making any?",
        unitsToProduce: 0,
        universalProductCode: null,
        sku: null,
        isSample: false,
        colorNamePosition: 4,
      },
    ]);

    return { user, design, variants, collection };
  });
}

test("createUPCsForCollection creates upcs for collection", async (t: Test) => {
  const { collection } = await createPrerequisites();
  await db.transaction((trx: Knex.Transaction) =>
    createUPCsForCollection(trx, collection.id)
  );
  const variants = await findByCollectionId(collection.id);
  t.true(
    variants.every((variant: VariantDb) =>
      Boolean(
        variant.universalProductCode &&
          variant.universalProductCode.match(/^\d{12}$/)
      )
    )
  );
});
