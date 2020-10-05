import uuid from "node-uuid";
import Knex from "knex";

import { VariantDb } from "../../components/product-design-variants/types";
import { create as createDesign } from "../../components/product-designs/dao";
import createUser = require("../../test-helpers/create-user");
import { test, Test } from "../../test-helpers/fresh";
import { replaceForDesign } from "../../components/product-design-variants/dao";
import db from "../db";
import backfillUpcsForDesign from ".";

async function createPrerequisites(): Promise<any> {
  const { user } = await createUser({ withSession: false });

  const design = await createDesign({
    productType: "TEESHIRT",
    title: "Plain White Tee",
    userId: user.id,
  });

  return await db.transaction(async (trx: Knex.Transaction) => {
    const variants = await replaceForDesign(trx, design.id, [
      {
        colorName: "Green",
        designId: design.id,
        id: uuid.v4(),
        position: 0,
        sizeName: "M",
        unitsToProduce: 123,
        universalProductCode: "000000000000",
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
    ]);

    return { user, design, variants };
  });
}

test("backfillUpcsForDesign creates upcs for collection", async (t: Test) => {
  const { design } = await createPrerequisites();
  const variants = await db.transaction((trx: Knex.Transaction) =>
    backfillUpcsForDesign(trx, design.id)
  );

  t.true(
    variants.every((variant: VariantDb) =>
      Boolean(
        variant.universalProductCode &&
          variant.universalProductCode.match(/^\d{12}$/)
      )
    ),
    "All variants have a UPC"
  );
  t.equal(
    variants[0].universalProductCode,
    "000000000000",
    "Exisiting UPCs are not modified"
  );
});
